import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

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
