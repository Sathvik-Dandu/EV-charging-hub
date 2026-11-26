import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { InvoicesService } from './invoices.service';
import { PAYMENT_METHODS, PaymentMethod } from './payment.service';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

class PayInvoiceDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method: PaymentMethod;
}

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Can('invoices:view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.invoices.findAll(user);
  }

  @Can('invoices:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.invoices.findOne(id, user);
  }

  @Can('invoices:pay')
  @Post(':id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: PayInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.pay(id, dto.method, user);
  }
}
