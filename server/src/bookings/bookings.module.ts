import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsController } from './bookings.controller';
import { BOOKING_QUEUE, BookingsService } from './bookings.service';
import { BookingsProcessor } from './bookings.processor';

@Module({
  imports: [BullModule.registerQueue({ name: BOOKING_QUEUE })],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsProcessor],
  exports: [BookingsService],
})
export class BookingsModule {}
