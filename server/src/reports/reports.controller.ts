import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Can } from '../common/auth.decorators';

@ApiTags('Reports')
@ApiBearerAuth()
@Can('reports:view')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('utilization')
  utilization(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.reports.utilization(days);
  }

  @Get('utilization-by-hour')
  utilizationByHour(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.reports.utilizationByHour(days);
  }

  @Get('revenue')
  revenue(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.reports.revenue(days);
  }

  @Get('faults')
  faults() {
    return this.reports.faults();
  }

  @Get('bookings')
  bookings(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.reports.bookings(days);
  }
}
