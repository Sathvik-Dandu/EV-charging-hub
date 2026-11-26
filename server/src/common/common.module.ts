import { Global, Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../realtime/events.gateway';
import { ChargerStatusService } from '../chargers/charger-status.service';

@Global()
@Module({
  providers: [AuditService, EventsGateway, ChargerStatusService],
  exports: [AuditService, EventsGateway, ChargerStatusService],
})
export class CommonModule {}
