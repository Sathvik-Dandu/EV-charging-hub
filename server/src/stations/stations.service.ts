import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStationDto, StationSearchDto, UpdateStationDto } from './dto/station.dto';
import { AuthUser } from '../common/auth.decorators';
import { ROLES } from '../common/business-rules';
import { ownsStation, scope } from '../common/scope';

@Injectable()
export class StationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async search(query: StationSearchDto, manager?: AuthUser) {
    const includeInactive = !!manager;
    const stations = await this.prisma.station.findMany({
      where: {
        ...(manager ? scope.stations(manager) : {}),
        isActive: includeInactive ? undefined : true,
        city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
        chargers: query.connector ? { some: { connectorType: query.connector, isActive: true } } : undefined,
      },
      include: {
        tariff: true,
        owner: { select: { fullName: true, organization: true } },
        chargers: { where: { isActive: includeInactive ? undefined : true }, orderBy: { code: 'asc' } },
      },
      orderBy: { code: 'asc' },
    });

    return stations
      .map((station) => ({
        ...station,
        availableCount: station.chargers.filter(
          (c) => c.status === 'AVAILABLE' && (!query.connector || c.connectorType === query.connector),
        ).length,
      }))
      .filter((station) => !query.available || station.availableCount > 0);
  }

  async cities() {
    const rows = await this.prisma.station.findMany({
      where: { isActive: true },
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    });
    return rows.map((r) => r.city);
  }

  async findOne(id: number) {
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: { tariff: true, chargers: { orderBy: { code: 'asc' } } },
    });
    if (!station) throw new NotFoundException('Station not found');
    return station;
  }

  async create(dto: CreateStationDto, user: AuthUser) {
    const code = dto.code.toUpperCase();
    if (await this.prisma.station.findUnique({ where: { code } })) {
      throw new ConflictException(`Station ID ${code} already exists`);
    }
    await this.prisma.tariff.findFirstOrThrow({ where: { id: dto.tariffId, isActive: true } }).catch(() => {
      throw new NotFoundException('Selected tariff does not exist or is inactive');
    });
    const ownerId = user.role === ROLES.STATION_OWNER ? user.id : null;
    const station = await this.prisma.station.create({ data: { ...dto, code, ownerId } });
    await this.audit.log(user.id, 'CREATE', 'Station', station.id, { code });
    return station;
  }

  async update(id: number, dto: UpdateStationDto, user: AuthUser) {
    const current = await this.findOne(id);
    if (!ownsStation(user, current)) throw new ForbiddenException('You can only edit your own stations');
    if (dto.code) {
      const clash = await this.prisma.station.findFirst({ where: { code: dto.code.toUpperCase(), NOT: { id } } });
      if (clash) throw new ConflictException(`Station ID ${dto.code} already exists`);
    }
    const station = await this.prisma.station.update({
      where: { id },
      data: { ...dto, code: dto.code?.toUpperCase() },
    });
    await this.audit.log(user.id, 'UPDATE', 'Station', id, dto);
    return station;
  }
}
