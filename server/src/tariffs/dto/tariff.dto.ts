import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTariffDto {
  @ApiProperty({ example: 'Metro Standard' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 18, description: 'Off-peak price per kWh (INR)' })
  @IsNumber()
  @Min(1)
  energyRate: number;

  @ApiProperty({ example: 24, description: 'Peak price per kWh (INR)' })
  @IsNumber()
  @Min(1)
  peakRate: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(0)
  @Max(23)
  peakStartHour: number;

  @ApiProperty({ example: 22 })
  @IsInt()
  @Min(1)
  @Max(24)
  peakEndHour: number;

  @ApiProperty({ example: 5, description: 'Idle fee per minute after grace period (INR)' })
  @IsNumber()
  @Min(0)
  idleFeePerMin: number;
}

export class UpdateTariffDto extends PartialType(CreateTariffDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
