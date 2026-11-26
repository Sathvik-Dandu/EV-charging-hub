import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTariffDto, UpdateTariffDto } from './dto/tariff.dto';

@Injectable()
export class TariffsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.tariff.findMany({
      include: { _count: { select: { stations: true } } },
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateTariffDto, adminId: number) {
    this.validateWindow(dto.peakStartHour, dto.peakEndHour);
    if (await this.prisma.tariff.findUnique({ where: { name: dto.name } })) {
      throw new ConflictException('A tariff with this name already exists');
    }
    const tariff = await this.prisma.tariff.create({ data: dto });
    await this.audit.log(adminId, 'CREATE', 'Tariff', tariff.id);
    return tariff;
  }

  async update(id: number, dto: UpdateTariffDto, adminId: number) {
    const current = await this.prisma.tariff.findUniqueOrThrow({ where: { id } });
    this.validateWindow(dto.peakStartHour ?? current.peakStartHour, dto.peakEndHour ?? current.peakEndHour);
    const tariff = await this.prisma.tariff.update({ where: { id }, data: dto });
    await this.audit.log(adminId, 'UPDATE', 'Tariff', id, dto);
    return tariff;
  }

  private validateWindow(start: number, end: number) {
    if (end <= start) throw new BadRequestException('Peak end hour must be after peak start hour');
  }
}
