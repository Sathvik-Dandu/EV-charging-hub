import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const since = (days: number) => new Date(new Date(Date.now() - (days - 1) * DAY).setHours(0, 0, 0, 0));

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async utilization(days: number) {
    const from = since(days);
    const stations = await this.prisma.station.findMany({
      where: { isActive: true },
      include: { chargers: { where: { isActive: true }, include: { sessions: { where: { startedAt: { gte: from } }, select: { durationMin: true } } } } },
      orderBy: { code: 'asc' },
    });
    return stations.map((s) => {
      const minutes = s.chargers.reduce((sum, c) => sum + c.sessions.reduce((m, x) => m + x.durationMin, 0), 0);
      const capacity = Math.max(1, s.chargers.length) * days * 24 * 60;
      return {
        code: s.code,
        station: s.name,
        city: s.city,
        chargers: s.chargers.length,
        sessions: s.chargers.reduce((n, c) => n + c.sessions.length, 0),
        chargingHours: round(minutes / 60),
        utilization: round((minutes / capacity) * 100),
      };
    });
  }

  async utilizationByHour(days: number) {
    const from = since(days);
    const [sessions, chargers] = await Promise.all([
      this.prisma.chargingSession.findMany({ where: { startedAt: { gte: from } }, select: { startedAt: true, durationMin: true } }),
      this.prisma.charger.count({ where: { isActive: true } }),
    ]);
    const minutes = Array<number>(24).fill(0);
    sessions.forEach((s) => {
      for (let m = 0; m < s.durationMin; m++) minutes[new Date(s.startedAt.getTime() + m * 60_000).getHours()]++;
    });
    return minutes.map((value, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      utilization: round((value / (Math.max(1, chargers) * days * 60)) * 100),
    }));
  }

  async revenue(days: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { createdAt: { gte: since(days) } },
      include: { session: { select: { energyKwh: true, charger: { select: { station: { select: { code: true, name: true } } } } } } },
    });
    const rows = new Map<string, { code: string; station: string; sessions: number; energy: number; revenue: number; paid: number }>();
    invoices.forEach((inv) => {
      const st = inv.session.charger.station;
      const row = rows.get(st.code) ?? { code: st.code, station: st.name, sessions: 0, energy: 0, revenue: 0, paid: 0 };
      row.sessions++;
      row.energy += inv.session.energyKwh;
      row.revenue += inv.totalAmount;
      if (inv.paymentStatus === 'PAID') row.paid += inv.totalAmount;
      rows.set(st.code, row);
    });
    return [...rows.values()].map((r) => ({ ...r, energy: round(r.energy), revenue: round(r.revenue, 2), paid: round(r.paid, 2) }));
  }

  async faults() {
    const tickets = await this.prisma.maintenanceTicket.findMany({
      include: { charger: { select: { code: true, station: { select: { name: true } } } }, assignedTo: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    return tickets.map((t) => ({
      ticketNo: t.ticketNo,
      charger: t.charger.code,
      station: t.charger.station.name,
      title: t.title,
      status: t.status,
      technician: t.assignedTo?.fullName ?? null,
      downtimeHours: round(((t.resolvedAt?.getTime() ?? now) - t.createdAt.getTime()) / 3_600_000),
    }));
  }

  async bookings(days: number) {
    const groups = await this.prisma.booking.groupBy({ by: ['status'], where: { startTime: { gte: since(days) } }, _count: true });
    const totals = { CONFIRMED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 };
    groups.forEach((g) => (totals[g.status] = g._count));
    return totals;
  }
}
