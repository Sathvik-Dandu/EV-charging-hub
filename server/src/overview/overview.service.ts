import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth.decorators';
import { ROLES, ROLES_NEEDING_APPROVAL } from '../common/business-rules';
import { scope } from '../common/scope';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthUser) {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const isEvOwner = user.role === ROLES.EV_OWNER;

    const [statusGroups, stations, activeSessions, openTickets, todayBookings, openEnquiries, pendingApprovals, myVehicles, myUpcoming, myPending] =
      await Promise.all([
        this.prisma.charger.groupBy({
          by: ['status'],
          where: { isActive: true, station: { isActive: true, ...scope.stations(user) } },
          _count: true,
        }),
        this.prisma.station.count({ where: { isActive: true, ...scope.stations(user) } }),
        this.prisma.chargingSession.count({ where: { status: 'ACTIVE', ...scope.sessions(user) } }),
        this.prisma.maintenanceTicket.count({ where: { status: { not: 'RESOLVED' }, ...scope.tickets(user) } }),
        this.prisma.booking.count({ where: { startTime: { gte: todayStart, lt: tomorrow }, ...scope.bookings(user) } }),
        this.prisma.enquiry.count({ where: { status: { not: 'RESOLVED' }, ...scope.enquiries(user) } }),
        user.role === ROLES.ADMIN
          ? this.prisma.user.count({ where: { approvalStatus: 'PENDING', role: { name: { in: ROLES_NEEDING_APPROVAL } } } })
          : 0,
        isEvOwner ? this.prisma.vehicle.count({ where: { ownerId: user.id } }) : 0,
        isEvOwner ? this.prisma.booking.count({ where: { userId: user.id, status: 'CONFIRMED', endTime: { gt: new Date() } } }) : 0,
        isEvOwner ? this.prisma.invoice.count({ where: { paymentStatus: 'PENDING', ...scope.invoices(user) } }) : 0,
      ]);

    const statusCounts = { AVAILABLE: 0, RESERVED: 0, CHARGING: 0, FAULTY: 0 };
    statusGroups.forEach((g) => (statusCounts[g.status] = g._count));

    return {
      stations,
      chargers: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      statusCounts,
      activeSessions,
      openTickets,
      todayBookings,
      openEnquiries,
      pendingApprovals,
      myVehicles,
      myUpcoming,
      myPending,
    };
  }
}
