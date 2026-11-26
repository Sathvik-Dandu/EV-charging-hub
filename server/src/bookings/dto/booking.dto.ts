import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { BUSINESS_RULES } from '../../common/business-rules';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  vehicleId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  chargerId: number;

  @ApiProperty({ example: '2026-11-24T10:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: 60, enum: BUSINESS_RULES.ALLOWED_SLOT_DURATIONS })
  @IsIn(BUSINESS_RULES.ALLOWED_SLOT_DURATIONS)
  durationMinutes: number;
}

export class RescheduleBookingDto {
  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ enum: BUSINESS_RULES.ALLOWED_SLOT_DURATIONS })
  @IsIn(BUSINESS_RULES.ALLOWED_SLOT_DURATIONS)
  durationMinutes: number;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
