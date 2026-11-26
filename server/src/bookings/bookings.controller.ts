import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CancelBookingDto, CreateBookingDto, RescheduleBookingDto } from './dto/booking.dto';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Can('bookings:view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.bookings.findForUser(user, status);
  }

  @Can('bookings:create')
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser) {
    return this.bookings.create(dto, user);
  }

  @Can('bookings:reschedule')
  @Patch(':id/reschedule')
  reschedule(@Param('id', ParseIntPipe) id: number, @Body() dto: RescheduleBookingDto, @CurrentUser() user: AuthUser) {
    return this.bookings.reschedule(id, dto, user);
  }

  @Can('bookings:cancel')
  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelBookingDto, @CurrentUser() user: AuthUser) {
    return this.bookings.cancel(id, user, dto.reason);
  }
}
