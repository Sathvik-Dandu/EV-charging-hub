import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth.decorators';
import { ROLES } from '../common/business-rules';
import { scope } from '../common/scope';
import { MockPaymentService, PaymentMethod } from './payment.service';

const invoiceInclude = {
  session: {
    include: {
      vehicle: { select: { registrationNo: true, make: true, model: true, ownerId: true } },
      charger: { select: { code: true, station: { select: { name: true, city: true, tariff: true } } } },
      booking: { select: { reference: true } },
    },
  },
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: MockPaymentService,
    private readonly audit: AuditService,
  ) {}

  findAll(user: AuthUser) {
    return this.prisma.invoice.findMany({
      where: scope.invoices(user),
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findOne(id: number, user: AuthUser) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, ...scope.invoices(user) }, include: invoiceInclude });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (user.role === ROLES.EV_OWNER && invoice.session.vehicle.ownerId !== user.id) {
      throw new ForbiddenException('Not your invoice');
    }
    return invoice;
  }

  async pay(id: number, method: PaymentMethod, user: AuthUser) {
    const invoice = await this.findOne(id, user);
    if (invoice.paymentStatus === 'PAID') throw new BadRequestException('Invoice is already paid');
    const result = await this.payments.charge(invoice.totalAmount, method);
    const paid = await this.prisma.invoice.update({
      where: { id },
      data: { paymentStatus: 'PAID', paymentRef: result.reference, paidAt: new Date() },
      include: invoiceInclude,
    });
    await this.audit.log(user.id, 'PAY', 'Invoice', id, { method, amount: invoice.totalAmount });
    return paid;
  }
}
