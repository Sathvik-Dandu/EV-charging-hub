import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { ChargerStatusService } from '../chargers/charger-status.service';
import { BookingsService } from '../bookings/bookings.service';
import { EVENTS, EventsGateway } from '../realtime/events.gateway';
import { AuthUser } from '../common/auth.decorators';
import { BUSINESS_RULES, ROLES } from '../common/business-rules';
import { generateCode } from '../common/codes';
import { ownsStation, scope } from '../common/scope';
import { can } from '../common/permissions';
import { calculateBill, simulateEnergy } from './billing';
import { StartSessionDto } from './dto/session.dto';

const EARLY_START_MINUTES = 30;

const sessionInclude = {
  vehicle: { select: { registrationNo: true, make: true, model: true, batteryKwh: true, ownerId: true } },
  charger: { select: { code: true, powerKw: true, connectorType: true, station: { select: { name: true, city: true } } } },
  booking: { select: { reference: true } },
  invoice: true,
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly chargerStatus: ChargerStatusService,
    private readonly bookings: BookingsService,
    private readonly events: EventsGateway,
  ) {}

  async findAll(user: AuthUser, status?: 'ACTIVE' | 'COMPLETED') {
    const sessions = await this.prisma.chargingSession.findMany({
      where: { status, ...scope.sessions(user) },
      include: sessionInclude,
      orderBy: { startedAt: 'desc' },
      take: 300,
    });
    return sessions.map((s) => (s.status === 'ACTIVE' ? { ...s, ...simulateEnergy(s.startedAt, s.charger.powerKw, s.vehicle.batteryKwh) } : s));
  }

  async start(dto: StartSessionDto, user: AuthUser) {
    if (dto.bookingReference) return this.startFromBooking(dto.bookingReference, user);
    if (dto.chargerId && dto.vehicleId) {
      if (!can(user.role, 'sessions:walkin')) throw new ForbiddenException('Only EV owners can start a walk-in session');
      return this.startWalkIn(dto.chargerId, dto.vehicleId, user);
    }
    throw new BadRequestException('Provide a booking reference, or a charger and vehicle for walk-in charging');
  }

  async stop(id: number, user: AuthUser) {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id },
      include: { vehicle: true, charger: { include: { station: { include: { prices: true } } } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Session is already completed');
    if (user.role === ROLES.EV_OWNER && session.vehicle.ownerId !== user.id) throw new ForbiddenException('Not your session');
    if (!ownsStation(user, session.charger.station)) throw new ForbiddenException('This session is not at your station');

    const price = session.charger.station.prices.find((p) => p.connectorType === session.charger.connectorType);
    if (!price) throw new BadRequestException(`Station has no ${session.charger.connectorType} price set`);
    const live = simulateEnergy(session.startedAt, session.charger.powerKw, session.vehicle.batteryKwh);
    const bill = calculateBill(live.energyKwh, price.pricePerKwh);

    const completed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.chargingSession.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          energyKwh: live.energyKwh,
          durationMin: live.durationMin,
          invoice: {
            create: {
              invoiceNo: generateCode('INV'),
              ...bill,
              ...(bill.totalAmount === 0 && { paymentStatus: 'PAID', paymentRef: 'NO-CHARGE', paidAt: new Date() }),
            },
          },
        },
        include: sessionInclude,
      });
      if (session.bookingId) await tx.booking.update({ where: { id: session.bookingId }, data: { status: 'COMPLETED' } });
      return updated;
    });

    const charger = await this.prisma.charger.findUniqueOrThrow({ where: { id: session.chargerId } });
    if (charger.status === 'CHARGING') {
      await this.chargerStatus.change(session.chargerId, 'AVAILABLE', `Session ${id} completed`);
    }
    await this.audit.log(user.id, 'STOP', 'ChargingSession', id, { energyKwh: live.energyKwh, total: bill.totalAmount });
    this.events.emit(EVENTS.SESSION_UPDATED, { id, status: 'COMPLETED' });
    return completed;
  }

  private async startFromBooking(reference: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({ where: { reference }, include: { charger: { include: { station: true } } } });
    if (!booking) throw new NotFoundException('Booking reference not found');
    if (user.role === ROLES.EV_OWNER && booking.userId !== user.id) throw new ForbiddenException('Not your booking');
    if (!ownsStation(user, booking.charger.station)) throw new ForbiddenException('This booking is not at your station');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException(`Booking is ${booking.status.toLowerCase()}`);

    const now = Date.now();
    const opensAt = booking.startTime.getTime() - EARLY_START_MINUTES * 60_000;
    const closesAt = booking.startTime.getTime() + BUSINESS_RULES.NO_SHOW_GRACE_MINUTES * 60_000;
    if (now < opensAt) throw new BadRequestException(`Session can start at most ${EARLY_START_MINUTES} minutes before the slot`);
    if (now > closesAt) throw new BadRequestException('Grace period is over, the booking has expired');
    if (booking.charger.status === 'FAULTY' || booking.charger.status === 'CHARGING') {
      throw new BadRequestException(`Charger is currently ${booking.charger.status.toLowerCase()}`);
    }
    await this.assertVehicleFree(booking.vehicleId);

    return this.redis.withLock(`charger:${booking.chargerId}`, async () => {
      const session = await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({ where: { id: booking.id }, data: { status: 'IN_PROGRESS' } });
        return tx.chargingSession.create({
          data: { bookingId: booking.id, chargerId: booking.chargerId, vehicleId: booking.vehicleId },
          include: sessionInclude,
        });
      });
      await this.bookings.removeJobs(booking.id);
      return this.afterStart(session, user);
    });
  }

  private async startWalkIn(chargerId: number, vehicleId: number, user: AuthUser) {
    return this.redis.withLock(`charger:${chargerId}`, async () => {
      const charger = await this.prisma.charger.findUnique({ where: { id: chargerId } });
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!charger || !vehicle) throw new NotFoundException('Charger or vehicle not found');
      if (user.role === ROLES.EV_OWNER && vehicle.ownerId !== user.id) throw new ForbiddenException('Not your vehicle');
      if (charger.status !== 'AVAILABLE') throw new BadRequestException('Walk-in charging needs an available charger');
      if (charger.connectorType !== vehicle.connectorType) {
        throw new BadRequestException(`Connector mismatch: vehicle uses ${vehicle.connectorType}, charger is ${charger.connectorType}`);
      }
      const nextHour = new Date(Date.now() + 60 * 60_000);
      const upcoming = await this.prisma.booking.findFirst({
        where: { chargerId, status: 'CONFIRMED', startTime: { lt: nextHour }, endTime: { gt: new Date() } },
      });
      if (upcoming) throw new BadRequestException('Charger is booked within the next hour, walk-in not allowed');
      await this.assertVehicleFree(vehicleId);

      const session = await this.prisma.chargingSession.create({ data: { chargerId, vehicleId }, include: sessionInclude });
      return this.afterStart(session, user);
    });
  }

  private async assertVehicleFree(vehicleId: number) {
    const active = await this.prisma.chargingSession.findFirst({ where: { vehicleId, status: 'ACTIVE' } });
    if (active) throw new BadRequestException('This vehicle is already charging in another session');
  }

  private async afterStart(session: { id: number; chargerId: number }, user: AuthUser) {
    await this.chargerStatus.change(session.chargerId, 'CHARGING', `Session ${session.id} started`);
    await this.audit.log(user.id, 'START', 'ChargingSession', session.id);
    this.events.emit(EVENTS.SESSION_UPDATED, { id: session.id, status: 'ACTIVE' });
    return session;
  }
}
