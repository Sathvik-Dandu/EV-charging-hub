import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StartSessionDto {
  @ApiPropertyOptional({ example: 'BK-261124-AB12', description: 'Booking reference for a reserved slot' })
  @IsOptional()
  @IsString()
  bookingReference?: string;

  @ApiPropertyOptional({ description: 'Walk-in only: charger to use' })
  @IsOptional()
  @IsInt()
  chargerId?: number;

  @ApiPropertyOptional({ description: 'Walk-in only: vehicle to charge' })
  @IsOptional()
  @IsInt()
  vehicleId?: number;
}

export class StopSessionDto {
  @ApiProperty({ example: 12, description: 'Minutes the vehicle stayed connected after charging completed' })
  @IsInt()
  @Min(0)
  @Max(600)
  idleMinutes: number;
}
