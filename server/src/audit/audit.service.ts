import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async log(userId: number | null, action: string, entity: string, entityId: string | number, details?: object) {
    this.logger.log(JSON.stringify({ userId, action, entity, entityId, details }));
    await this.prisma.auditLog.create({
      data: { userId, action, entity, entityId: String(entityId), details: details ? JSON.stringify(details) : null },
    });
  }
}
