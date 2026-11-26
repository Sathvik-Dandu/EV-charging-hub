import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'A record with this unique value already exists'],
      P2025: [HttpStatus.NOT_FOUND, 'Record not found'],
      P2003: [HttpStatus.BAD_REQUEST, 'Related record does not exist'],
      P2034: [HttpStatus.CONFLICT, 'Another booking was made at the same time, please retry'],
    };
    const [statusCode, message] = map[error.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Database error'];
    response.status(statusCode).json({ statusCode, message, error: error.code });
  }
}
