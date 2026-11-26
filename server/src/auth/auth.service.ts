import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ROLES, ROLES_NEEDING_APPROVAL, RoleName } from '../common/business-rules';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('Email is already registered');

    const roleName = (dto.role ?? ROLES.EV_OWNER) as RoleName;
    if (roleName === ROLES.STATION_OWNER && !dto.organization?.trim()) {
      throw new BadRequestException('Business name is required for station owners');
    }
    const needsApproval = ROLES_NEEDING_APPROVAL.includes(roleName);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        organization: dto.organization?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: role.id,
        approvalStatus: needsApproval ? 'PENDING' : 'APPROVED',
      },
      include: { role: true },
    });
    await this.audit.log(user.id, 'REGISTER', 'User', user.id, { role: roleName });

    if (needsApproval) {
      return { pending: true, message: 'Your request has been sent to the administrator. You can sign in once it is approved.' };
    }
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    this.assertCanSignIn(user);
    await this.audit.log(user.id, 'LOGIN', 'User', user.id);
    return this.issueTokens(user);
  }

  private assertCanSignIn(user: { isActive: boolean; approvalStatus: string; rejectionReason: string | null }) {
    if (user.approvalStatus === 'PENDING') throw new ForbiddenException('Your account is waiting for administrator approval');
    if (user.approvalStatus === 'REJECTED') {
      throw new ForbiddenException(`Your registration was rejected${user.rejectionReason ? `: ${user.rejectionReason}` : ''}`);
    }
    if (!user.isActive) throw new ForbiddenException('Account is deactivated, contact the administrator');
  }

  async refresh(refreshToken: string) {
    let payload: { id: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Refresh token expired');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.id }, include: { role: true } });
    if (!user?.isActive || user.approvalStatus !== 'APPROVED' || !user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
      throw new UnauthorizedException('Refresh token revoked');
    }
    return this.issueTokens(user);
  }

  async logout(userId: number) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    return { message: 'Logged out' };
  }

  private async issueTokens(user: { id: number; email: string; fullName: string; role: { name: string } }) {
    const payload = { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES as never,
    });
    const refreshToken = await this.jwt.signAsync(
      { id: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRES as never },
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
    });
    return { accessToken, refreshToken, user: payload };
  }
}
