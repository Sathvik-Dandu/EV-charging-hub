import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { MockPaymentService } from './payment.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, MockPaymentService],
})
export class InvoicesModule {}
