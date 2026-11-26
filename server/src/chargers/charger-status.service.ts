import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTS, EventsGateway } from '../realtime/events.gateway';
import { ChargerStatus } from '../generated/prisma/client';

@Injectable()
export class ChargerStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async change(chargerId: number, toStatus: ChargerStatus, reason: string) {
    const charger = await this.prisma.charger.findUniqueOrThrow({ where: { id: chargerId } });
    if (charger.status === toStatus) return charger;

    const [updated] = await this.prisma.$transaction([
      this.prisma.charger.update({ where: { id: chargerId }, data: { status: toStatus } }),
      this.prisma.chargerStatusLog.create({
        data: { chargerId, fromStatus: charger.status, toStatus, reason },
      }),
    ]);

    this.events.emit(EVENTS.CHARGER_STATUS, {
      chargerId,
      code: updated.code,
      stationId: updated.stationId,
      status: toStatus,
      reason,
      at: new Date().toISOString(),
    });
    return updated;
  }
}
