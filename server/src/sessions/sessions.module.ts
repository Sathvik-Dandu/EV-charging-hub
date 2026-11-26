import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [BookingsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
