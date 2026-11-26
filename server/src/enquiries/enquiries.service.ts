import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth.decorators';
import { scope } from '../common/scope';
import { CreateEnquiryDto, ReplyEnquiryDto } from './dto/enquiry.dto';

const enquiryInclude = { user: { select: { fullName: true, email: true, role: { select: { name: true } } } } };

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateEnquiryDto, user: AuthUser) {
    const enquiry = await this.prisma.enquiry.create({ data: { ...dto, userId: user.id }, include: enquiryInclude });
    await this.audit.log(user.id, 'CREATE', 'Enquiry', enquiry.id, { category: dto.category });
    return enquiry;
  }

  findAll(user: AuthUser) {
    return this.prisma.enquiry.findMany({ where: scope.enquiries(user), include: enquiryInclude, orderBy: { createdAt: 'desc' } });
  }

  async reply(id: number, dto: ReplyEnquiryDto, managerId: number) {
    if (dto.status === 'RESOLVED' && !dto.reply) {
      const current = await this.prisma.enquiry.findUniqueOrThrow({ where: { id } });
      if (!current.reply) throw new BadRequestException('Add a reply before marking the enquiry resolved');
    }
    const enquiry = await this.prisma.enquiry.update({
      where: { id },
      data: { status: dto.status, ...(dto.reply && { reply: dto.reply, repliedAt: new Date() }) },
      include: enquiryInclude,
    });
    await this.audit.log(managerId, 'REPLY', 'Enquiry', id, { status: dto.status });
    return enquiry;
  }
}
