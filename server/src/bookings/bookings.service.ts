import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { ChargerStatusService } from '../chargers/charger-status.service';
import { EVENTS, EventsGateway } from '../realtime/events.gateway';
import { AuthUser } from '../common/auth.decorators';
import { BUSINESS_RULES, ROLES } from '../common/business-rules';
import { generateCode } from '../common/codes';
import { ownsStation, scope } from '../common/scope';
import { validateSlot } from './booking.rules';
import { CreateBookingDto, RescheduleBookingDto } from './dto/booking.dto';

export const BOOKING_QUEUE = 'bookings';

const bookingInclude = {
  vehicle: { select: { registrationNo: true, make: true, model: true, connectorType: true } },
  charger: { select: { code: true, connectorType: true, powerKw: true, station: { select: { name: true, city: true } } } },
  user: { select: { fullName: true, email: true } },
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly chargerStatus: ChargerStatusService,
    private readonly events: EventsGateway,
    @InjectQueue(BOOKING_QUEUE) private readonly queue: Queue,
  ) {}

  findForUser(user: AuthUser, status?: string) {
    return this.prisma.booking.findMany({
      where: { ...scope.bookings(user), status: status ? (status as never) : undefined },
      include: { ...bookingInclude, session: { select: { id: true, status: true } } },
      orderBy: { startTime: 'desc' },
      take: 300,
    });
  }

  async create(dto: CreateBookingDto, user: AuthUser) {
    const start = new Date(dto.startTime);
    const end = new Date(start.getTime() + dto.durationMinutes * 60_000);

    return this.redis.withLock(`charger:${dto.chargerId}`, async () => {
      await this.checkBookingRules(user.id, dto.vehicleId, dto.chargerId, start, dto.durationMinutes);

      const upcoming = await this.prisma.booking.count({
        where: { userId: user.id, status: 'CONFIRMED', endTime: { gt: new Date() } },
      });
      if (upcoming >= BUSINESS_RULES.MAX_UPCOMING_BOOKINGS) {
        throw new BadRequestException(
          `You can hold a maximum of ${BUSINESS_RULES.MAX_UPCOMING_BOOKINGS} upcoming bookings at a time`,
        );
      }

      const booking = await this.prisma.$transaction(
        async (tx) => {
          await this.assertNoOverlap(tx, dto.chargerId, dto.vehicleId, start, end);
          return tx.booking.create({
            data: {
              reference: generateCode('BK'),
              userId: user.id,
              vehicleId: dto.vehicleId,
              chargerId: dto.chargerId,
              startTime: start,
              endTime: end,
            },
            include: bookingInclude,
          });
        },
        { isolationLevel: 'Serializable' },
      );

      await this.scheduleJobs(booking.id, start);
      await this.audit.log(user.id, 'CREATE', 'Booking', booking.id, { reference: booking.reference });
      this.events.emit(EVENTS.BOOKING_UPDATED, { id: booking.id, status: booking.status });
      return booking;
    });
  }

  async reschedule(id: number, dto: RescheduleBookingDto, user: AuthUser) {
    const booking = await this.getOwnedBooking(id, user);
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Only confirmed bookings can be rescheduled');
    if (booking.startTime <= new Date()) throw new BadRequestException('Slot has already started, it cannot be rescheduled');

    const start = new Date(dto.startTime);
    const end = new Date(start.getTime() + dto.durationMinutes * 60_000);

    return this.redis.withLock(`charger:${booking.chargerId}`, async () => {
      await this.checkBookingRules(booking.userId, booking.vehicleId, booking.chargerId, start, dto.durationMinutes);
      const updated = await this.prisma.$transaction(
        async (tx) => {
          await this.assertNoOverlap(tx, booking.chargerId, booking.vehicleId, start, end, id);
          return tx.booking.update({ where: { id }, data: { startTime: start, endTime: end }, include: bookingInclude });
        },
        { isolationLevel: 'Serializable' },
      );
      await this.releaseChargerIfReserved(booking.chargerId, 'Booking rescheduled');
      await this.scheduleJobs(id, start);
      await this.audit.log(user.id, 'RESCHEDULE', 'Booking', id, { startTime: start });
      this.events.emit(EVENTS.BOOKING_UPDATED, { id, status: updated.status });
      return updated;
    });
  }

  async cancel(id: number, user: AuthUser, reason?: string) {
    const booking = await this.getOwnedBooking(id, user);
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Only confirmed bookings can be cancelled');
    if (booking.startTime <= new Date() && user.role === ROLES.EV_OWNER) {
      throw new BadRequestException('Cancellation is allowed only before the slot start time');
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason ?? 'Cancelled by user' },
      include: bookingInclude,
    });
    await this.removeJobs(id);
    await this.releaseChargerIfReserved(booking.chargerId, 'Booking cancelled');
    await this.audit.log(user.id, 'CANCEL', 'Booking', id, { reason });
    this.events.emit(EVENTS.BOOKING_UPDATED, { id, status: 'CANCELLED' });
    return updated;
  }

  async markSlotStarted(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { charger: true } });
    if (booking?.status === 'CONFIRMED' && booking.charger.status === 'AVAILABLE') {
      await this.chargerStatus.change(booking.chargerId, 'RESERVED', `Reserved for booking ${booking.reference}`);
    }
  }

  async releaseNoShows() {
    const cutoff = new Date(Date.now() - BUSINESS_RULES.NO_SHOW_GRACE_MINUTES * 60_000);
    const expired = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', startTime: { lte: cutoff } },
    });
    for (const booking of expired) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'NO_SHOW',
          cancelReason: `Auto-released: session not started within ${BUSINESS_RULES.NO_SHOW_GRACE_MINUTES} minutes`,
        },
      });
      await this.releaseChargerIfReserved(booking.chargerId, `No-show on booking ${booking.reference}`);
      await this.audit.log(null, 'NO_SHOW', 'Booking', booking.id);
      this.events.emit(EVENTS.BOOKING_UPDATED, { id: booking.id, status: 'NO_SHOW' });
    }
    return expired.length;
  }

  async removeJobs(bookingId: number) {
    await this.queue.remove(`slot-start-${bookingId}`);
    await this.queue.remove(`no-show-${bookingId}`);
  }

  private async checkBookingRules(userId: number, vehicleId: number, chargerId: number, start: Date, duration: number) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, ownerId: userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found in your profile');

    const charger = await this.prisma.charger.findUnique({ where: { id: chargerId }, include: { station: true } });
    if (!charger || !charger.isActive || !charger.station.isActive) throw new NotFoundException('Charger not available');
    if (charger.status === 'FAULTY') throw new BadRequestException('This charger is faulty or under maintenance');
    if (charger.connectorType !== vehicle.connectorType) {
      throw new BadRequestException(
        `Connector mismatch: vehicle uses ${vehicle.connectorType} but charger provides ${charger.connectorType}`,
      );
    }

    const slotError = validateSlot(start, duration, charger.station);
    if (slotError) throw new BadRequestException(slotError);
  }

  private async assertNoOverlap(
    tx: Pick<PrismaService, 'booking'>,
    chargerId: number,
    vehicleId: number,
    start: Date,
    end: Date,
    excludeId?: number,
  ) {
    const clash = await tx.booking.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        startTime: { lt: end },
        endTime: { gt: start },
        OR: [{ chargerId }, { vehicleId }],
      },
    });
    if (clash?.chargerId === chargerId) throw new ConflictException('This slot is already booked on the selected charger');
    if (clash) throw new ConflictException('Your vehicle already has a booking that overlaps this slot');
  }

  private async getOwnedBooking(id: number, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { charger: { include: { station: true } } } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (user.role === ROLES.EV_OWNER && booking.userId !== user.id) throw new ForbiddenException('Not your booking');
    if (!ownsStation(user, booking.charger.station)) throw new ForbiddenException('This booking is not at your station');
    return booking;
  }

  private async releaseChargerIfReserved(chargerId: number, reason: string) {
    const charger = await this.prisma.charger.findUnique({ where: { id: chargerId } });
    if (charger?.status === 'RESERVED') await this.chargerStatus.change(chargerId, 'AVAILABLE', reason);
  }

  private async scheduleJobs(bookingId: number, start: Date) {
    await this.removeJobs(bookingId);
    const untilStart = Math.max(0, start.getTime() - Date.now());
    const untilNoShow = untilStart + BUSINESS_RULES.NO_SHOW_GRACE_MINUTES * 60_000;
    await this.queue.add('slot-start', { bookingId }, { jobId: `slot-start-${bookingId}`, delay: untilStart, removeOnComplete: true });
    await this.queue.add('no-show', { bookingId }, { jobId: `no-show-${bookingId}`, delay: untilNoShow, removeOnComplete: true });
  }
}
