import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findMine(ownerId: number) {
    return this.prisma.vehicle.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateVehicleDto, ownerId: number) {
    const registrationNo = dto.registrationNo.toUpperCase();
    if (await this.prisma.vehicle.findUnique({ where: { registrationNo } })) {
      throw new ConflictException('A vehicle with this registration number already exists');
    }
    const vehicle = await this.prisma.vehicle.create({ data: { ...dto, registrationNo, ownerId } });
    await this.audit.log(ownerId, 'CREATE', 'Vehicle', vehicle.id);
    return vehicle;
  }

  async remove(id: number, ownerId: number) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, ownerId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const used = await this.prisma.booking.count({ where: { vehicleId: id } });
    if (used) throw new BadRequestException('Vehicle has booking history and cannot be deleted');
    await this.prisma.vehicle.delete({ where: { id } });
    await this.audit.log(ownerId, 'DELETE', 'Vehicle', id);
    return { message: 'Vehicle removed' };
  }
}
