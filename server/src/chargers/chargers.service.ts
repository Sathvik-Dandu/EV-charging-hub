import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateChargerDto } from './dto/charger.dto';
import { chargerPowerError, priceError } from './charger.rules';
import { AuthUser } from '../common/auth.decorators';
import { ownsStation, scope } from '../common/scope';

@Injectable()
export class ChargersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll(user: AuthUser) {
    return this.prisma.charger.findMany({
      where: scope.chargers(user),
      include: { station: { select: { name: true, code: true, city: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async create(dto: CreateChargerDto, user: AuthUser) {
    const code = dto.code.toUpperCase();
    const powerError = chargerPowerError(dto.connectorType, dto.powerKw);
    if (powerError) throw new BadRequestException(powerError);
    if (await this.prisma.charger.findUnique({ where: { code } })) {
      throw new ConflictException(`Charger ID ${code} already exists`);
    }
    const station = await this.prisma.station.findUnique({ where: { id: dto.stationId } });
    if (!station) throw new NotFoundException('Station not found');
    if (!ownsStation(user, station)) throw new ForbiddenException('You can only add chargers to your own stations');

    const { pricePerKwh, peakPricePerKwh, ...chargerData } = dto;
    const key = { stationId: dto.stationId, connectorType: dto.connectorType };
    const hasPrice = pricePerKwh !== undefined && peakPricePerKwh !== undefined;
    if (hasPrice) {
      const error = priceError({ pricePerKwh, peakPricePerKwh });
      if (error) throw new BadRequestException(error);
    } else if (!(await this.prisma.price.findUnique({ where: { stationId_connectorType: key } }))) {
      throw new BadRequestException('Set the price per kWh and peak price for this charging type');
    }

    const charger = await this.prisma.$transaction(async (tx) => {
      if (hasPrice) {
        await tx.price.upsert({
          where: { stationId_connectorType: key },
          create: { ...key, pricePerKwh, peakPricePerKwh },
          update: { pricePerKwh, peakPricePerKwh },
        });
      }
      return tx.charger.create({
        data: { ...chargerData, code, statusLogs: { create: { toStatus: 'AVAILABLE', reason: 'Charger registered' } } },
      });
    });
    await this.audit.log(user.id, 'CREATE', 'Charger', charger.id, { code });
    return charger;
  }

  async setActive(id: number, isActive: boolean, user: AuthUser) {
    const existing = await this.prisma.charger.findUnique({ where: { id }, include: { station: true } });
    if (!existing) throw new NotFoundException('Charger not found');
    if (!ownsStation(user, existing.station)) throw new ForbiddenException('You can only change chargers at your own stations');
    const charger = await this.prisma.charger.update({ where: { id }, data: { isActive } });
    await this.audit.log(user.id, isActive ? 'ACTIVATE' : 'DEACTIVATE', 'Charger', id);
    return charger;
  }

  async slots(id: number, date: string) {
    const charger = await this.prisma.charger.findUnique({ where: { id }, include: { station: true } });
    if (!charger) throw new NotFoundException('Charger not found');
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const bookings = await this.prisma.booking.findMany({
      where: {
        chargerId: id,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    });
    return { charger, bookings };
  }

  history(id: number) {
    return this.prisma.chargerStatusLog.findMany({
      where: { chargerId: id },
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
  }
}
