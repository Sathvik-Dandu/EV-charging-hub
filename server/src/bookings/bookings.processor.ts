import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { BOOKING_QUEUE, BookingsService } from './bookings.service';

@Processor(BOOKING_QUEUE)
export class BookingsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger('BookingJobs');

  constructor(
    private readonly bookings: BookingsService,
    @InjectQueue(BOOKING_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler('no-show-sweep', { every: 60_000 }, { name: 'no-show-sweep' });
  }

  async process(job: Job<{ bookingId?: number }>) {
    if (job.name === 'slot-start' && job.data.bookingId) {
      await this.bookings.markSlotStarted(job.data.bookingId);
    }
    if (job.name === 'no-show' || job.name === 'no-show-sweep') {
      const released = await this.bookings.releaseNoShows();
      if (released) this.logger.log(`Released ${released} no-show booking(s)`);
    }
  }
}
