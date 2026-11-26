import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ROLES, ROLES_NEEDING_APPROVAL } from '../common/business-rules';
import { CreateUserDto } from './dto/user.dto';

const publicFields = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  approvalStatus: true,
  rejectionReason: true,
  organization: true,
  createdAt: true,
  role: { select: { name: true } },
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({ where: { approvalStatus: 'APPROVED' }, select: publicFields, orderBy: { id: 'asc' } });
  }

  requests() {
    return this.prisma.user.findMany({
      where: { role: { name: { in: ROLES_NEEDING_APPROVAL } } },
      select: publicFields,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: number, adminId: number) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
      select: publicFields,
    });
    await this.audit.log(adminId, 'APPROVE', 'User', id);
    return user;
  }

  async reject(id: number, reason: string, adminId: number) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { approvalStatus: 'REJECTED', rejectionReason: reason, refreshTokenHash: null },
      select: publicFields,
    });
    await this.audit.log(adminId, 'REJECT', 'User', id, { reason });
    return user;
  }

  findTechnicians() {
    return this.prisma.user.findMany({
      where: { role: { name: ROLES.TECHNICIAN }, isActive: true, approvalStatus: 'APPROVED' },
      select: { id: true, fullName: true },
    });
  }

  roles() {
    return this.prisma.role.findMany({ orderBy: { id: 'asc' } });
  }

  async create(dto: CreateUserDto, adminId: number) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })) {
      throw new ConflictException('Email is already registered');
    }
    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        organization: dto.organization?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: role.id,
      },
      select: publicFields,
    });
    await this.audit.log(adminId, 'CREATE', 'User', user.id, { role: dto.role });
    return user;
  }

  async setRole(id: number, roleName: string, adminId: number) {
    if (id === adminId) throw new BadRequestException('You cannot change your own role');
    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId: role.id, refreshTokenHash: null },
      select: publicFields,
    });
    await this.audit.log(adminId, 'CHANGE_ROLE', 'User', id, { role: roleName });
    return user;
  }

  async setStatus(id: number, isActive: boolean, adminId: number) {
    if (id === adminId) throw new BadRequestException('You cannot deactivate your own account');
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive, refreshTokenHash: isActive ? undefined : null },
      select: publicFields,
    });
    await this.audit.log(adminId, isActive ? 'ACTIVATE' : 'DEACTIVATE', 'User', id);
    return user;
  }
}
