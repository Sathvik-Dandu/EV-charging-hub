import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStationDto, StationPricesDto, StationSearchDto, UpdateStationDto } from './dto/station.dto';
import { peakHoursError, priceError } from '../chargers/charger.rules';
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
        prices: { orderBy: { connectorType: 'asc' } },
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
      include: { prices: { orderBy: { connectorType: 'asc' } }, chargers: { orderBy: { code: 'asc' } } },
    });
    if (!station) throw new NotFoundException('Station not found');
    return station;
  }

  async create(dto: CreateStationDto, user: AuthUser) {
    const code = dto.code.toUpperCase();
    if (await this.prisma.station.findUnique({ where: { code } })) {
      throw new ConflictException(`Station ID ${code} already exists`);
    }
    const hoursError = peakHoursError(dto);
    if (hoursError) throw new BadRequestException(hoursError);
    const station = await this.prisma.station.create({ data: { ...dto, code, ownerId: user.id } });
    await this.audit.log(user.id, 'CREATE', 'Station', station.id, { code });
    return station;
  }

  async update(id: number, dto: UpdateStationDto, user: AuthUser) {
    const current = await this.findOne(id);
    if (!ownsStation(user, current)) throw new ForbiddenException('You can only edit your own stations');
    const changesPrices = ['peakStartHour', 'peakEndHour', 'idleFeePerMin'].some((k) => k in dto);
    if (changesPrices && user.role !== ROLES.STATION_OWNER) throw new ForbiddenException('Only the station owner sets prices');
    const hoursError = peakHoursError({ ...current, ...dto });
    if (hoursError) throw new BadRequestException(hoursError);
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

  async setPrices(id: number, dto: StationPricesDto, user: AuthUser) {
    const station = await this.findOne(id);
    if (user.role !== ROLES.STATION_OWNER || !ownsStation(user, station)) {
      throw new ForbiddenException('Only the owner of this station can set its prices');
    }
    const hoursError = peakHoursError(dto);
    if (hoursError) throw new BadRequestException(hoursError);
    const types = dto.prices.map((p) => p.connectorType);
    if (new Set(types).size !== types.length) throw new BadRequestException('Each charging type can have only one price');
    for (const price of dto.prices) {
      const error = priceError(price);
      if (error) throw new BadRequestException(`${price.connectorType}: ${error}`);
    }
    const inUse = [...new Set(station.chargers.map((c) => c.connectorType))];
    const missing = inUse.filter((t) => !types.includes(t));
    if (missing.length) throw new BadRequestException(`A price is needed for ${missing.join(', ')} (chargers of this type exist)`);

    await this.prisma.$transaction([
      this.prisma.station.update({
        where: { id },
        data: { peakStartHour: dto.peakStartHour, peakEndHour: dto.peakEndHour, idleFeePerMin: dto.idleFeePerMin },
      }),
      this.prisma.price.deleteMany({ where: { stationId: id, connectorType: { notIn: types } } }),
      ...dto.prices.map((p) =>
        this.prisma.price.upsert({
          where: { stationId_connectorType: { stationId: id, connectorType: p.connectorType } },
          create: { stationId: id, ...p },
          update: { pricePerKwh: p.pricePerKwh, peakPricePerKwh: p.peakPricePerKwh },
        }),
      ),
    ]);
    await this.audit.log(user.id, 'UPDATE_PRICES', 'Station', id, dto);
    return this.findOne(id);
  }
}
