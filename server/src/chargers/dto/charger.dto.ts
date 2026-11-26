import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';
import { ConnectorType } from '../../generated/prisma/enums';
import { BUSINESS_RULES } from '../../common/business-rules';

export class CreateChargerDto {
  @ApiProperty({ example: 'BLR-005-C1' })
  @Matches(/^[A-Z]{3}-\d{3}-C\d{1,2}$/, { message: 'Charger code must look like BLR-005-C1' })
  code: string;

  @ApiProperty({ enum: ConnectorType })
  @IsEnum(ConnectorType)
  connectorType: ConnectorType;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(3)
  @Max(350)
  powerKw: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  stationId: number;

  @ApiPropertyOptional({ example: 18, description: 'Needed for the first charger of this type at the station' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(BUSINESS_RULES.MAX_PRICE_PER_KWH)
  pricePerKwh?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(BUSINESS_RULES.MAX_PRICE_PER_KWH)
  peakPricePerKwh?: number;
}

export class ChargerActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
