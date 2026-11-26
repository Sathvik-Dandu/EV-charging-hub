import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChargerStatusService } from '../chargers/charger-status.service';
import { BookingsService } from '../bookings/bookings.service';
import { EVENTS, EventsGateway } from '../realtime/events.gateway';
import { AuthUser } from '../common/auth.decorators';
import { ROLES } from '../common/business-rules';
import { generateCode } from '../common/codes';
import { ownsStation, scope } from '../common/scope';
import { TicketStatus } from '../generated/prisma/enums';
import { CreateTicketDto, UpdateTicketStatusDto } from './dto/ticket.dto';

const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: null,
};

const ticketInclude = {
  charger: { select: { code: true, status: true, station: { select: { name: true, city: true } } } },
  reportedBy: { select: { fullName: true } },
  assignedTo: { select: { id: true, fullName: true } },
};

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly chargerStatus: ChargerStatusService,
    private readonly bookings: BookingsService,
    private readonly events: EventsGateway,
  ) {}

  findAll(user: AuthUser) {
    return this.prisma.maintenanceTicket.findMany({ where: scope.tickets(user), include: ticketInclude, orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateTicketDto, user: AuthUser) {
    const charger = await this.prisma.charger.findUnique({ where: { id: dto.chargerId }, include: { station: true } });
    if (!charger) throw new NotFoundException('Charger not found');
    if (!ownsStation(user, charger.station)) throw new ForbiddenException('You can only report faults on chargers at your stations');

    const ticket = await this.prisma.maintenanceTicket.create({
      data: { ...dto, ticketNo: generateCode('TKT'), reportedById: user.id },
      include: ticketInclude,
    });
    await this.chargerStatus.change(dto.chargerId, 'FAULTY', `Fault reported: ${dto.title}`);

    const affected = await this.prisma.booking.findMany({
      where: { chargerId: dto.chargerId, status: 'CONFIRMED', endTime: { gt: new Date() } },
    });
    for (const booking of affected) {
      await this.bookings.cancel(booking.id, { ...user, role: ROLES.ADMIN }, 'Charger fault reported, please rebook');
    }

    await this.audit.log(user.id, 'CREATE', 'MaintenanceTicket', ticket.id, { cancelledBookings: affected.length });
    this.events.emit(EVENTS.TICKET_UPDATED, { id: ticket.id, status: ticket.status });
    return ticket;
  }

  async assign(id: number, technicianId: number, user: AuthUser) {
    const ticket = await this.getTicket(id);
    if (ticket.status === 'RESOLVED') throw new BadRequestException('Ticket is already resolved');
    const tech = await this.prisma.user.findFirst({ where: { id: technicianId, role: { name: ROLES.TECHNICIAN } } });
    if (!tech) throw new BadRequestException('Selected user is not a technician');

    const updated = await this.prisma.maintenanceTicket.update({
      where: { id },
      data: { assignedToId: technicianId },
      include: ticketInclude,
    });
    await this.audit.log(user.id, 'ASSIGN', 'MaintenanceTicket', id, { technicianId });
    this.events.emit(EVENTS.TICKET_UPDATED, { id, status: updated.status });
    return updated;
  }

  async updateStatus(id: number, dto: UpdateTicketStatusDto, user: AuthUser) {
    const ticket = await this.getTicket(id);
    if (user.role === ROLES.TECHNICIAN && ticket.assignedToId !== user.id) {
      throw new ForbiddenException('This ticket is not assigned to you');
    }
    if (!ticket.assignedToId) throw new BadRequestException('Assign a technician before updating the ticket');
    if (NEXT_STATUS[ticket.status] !== dto.status) {
      throw new BadRequestException(`Ticket can move from ${ticket.status} only to ${NEXT_STATUS[ticket.status] ?? 'nothing'}`);
    }
    if (dto.status === 'RESOLVED' && !dto.resolution) throw new BadRequestException('Resolution notes are required');

    const updated = await this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : undefined,
      },
      include: ticketInclude,
    });

    if (dto.status === 'RESOLVED') {
      const stillOpen = await this.prisma.maintenanceTicket.count({
        where: { chargerId: ticket.chargerId, status: { not: 'RESOLVED' } },
      });
      if (!stillOpen) await this.chargerStatus.change(ticket.chargerId, 'AVAILABLE', `Repaired via ${ticket.ticketNo}`);
    }

    await this.audit.log(user.id, 'STATUS', 'MaintenanceTicket', id, { status: dto.status });
    this.events.emit(EVENTS.TICKET_UPDATED, { id, status: dto.status });
    return updated;
  }

  private async getTicket(id: number) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
