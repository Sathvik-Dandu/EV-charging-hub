import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export const EVENTS = {
  CHARGER_STATUS: 'charger:status',
  BOOKING_UPDATED: 'booking:updated',
  SESSION_UPDATED: 'session:updated',
  TICKET_UPDATED: 'ticket:updated',
};

@WebSocketGateway({ cors: { origin: true } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emit(event: string, payload: unknown) {
    this.server?.emit(event, payload);
  }
}
