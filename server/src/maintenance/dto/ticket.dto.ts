import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TicketPriority, TicketStatus } from '../../generated/prisma/enums';

export class CreateTicketDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  chargerId: number;

  @ApiProperty({ example: 'Connector not locking' })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'CCS2 gun does not lock into the vehicle inlet' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  priority: TicketPriority;
}

export class AssignTicketDto {
  @ApiProperty()
  @IsInt()
  technicianId: number;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiPropertyOptional({ example: 'Replaced locking solenoid' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  resolution?: string;
}
