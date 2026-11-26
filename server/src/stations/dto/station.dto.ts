import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested,
} from 'class-validator';
import { ConnectorType } from '../../generated/prisma/enums';
import { BUSINESS_RULES } from '../../common/business-rules';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateStationDto {
  @ApiProperty({ example: 'BLR-005' })
  @Matches(/^[A-Z]{3}-\d{3}$/, { message: 'Station code must look like BLR-005' })
  code: string;

  @ApiProperty({ example: 'Koramangala Charge Point' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: '80 Feet Road, Koramangala' })
  @IsString()
  @MinLength(5)
  address: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MinLength(2)
  city: string;

  @ApiProperty({ example: 12.9352 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 77.6245 })
  @IsLongitude()
  longitude: number;

  @ApiProperty({ example: '06:00' })
  @Matches(TIME, { message: 'Opening time must be HH:mm' })
  opensAt: string;

  @ApiProperty({ example: '23:00' })
  @Matches(TIME, { message: 'Closing time must be HH:mm' })
  closesAt: string;

  @ApiProperty({ example: 18, description: 'Peak hours start (0-23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  peakStartHour: number;

  @ApiProperty({ example: 22, description: 'Peak hours end (1-24)' })
  @IsInt()
  @Min(1)
  @Max(24)
  peakEndHour: number;

  @ApiProperty({ example: 5, description: 'Idle fee per minute after the free minutes' })
  @IsNumber()
  @Min(0)
  @Max(BUSINESS_RULES.MAX_IDLE_FEE_PER_MIN)
  idleFeePerMin: number;
}

export class PriceDto {
  @ApiProperty({ enum: ConnectorType })
  @IsEnum(ConnectorType)
  connectorType: ConnectorType;

  @ApiProperty({ example: 18, description: 'Price per kWh (normal hours)' })
  @IsNumber()
  @Min(1)
  @Max(BUSINESS_RULES.MAX_PRICE_PER_KWH)
  pricePerKwh: number;

  @ApiProperty({ example: 24, description: 'Price per kWh during peak hours' })
  @IsNumber()
  @Min(1)
  @Max(BUSINESS_RULES.MAX_PRICE_PER_KWH)
  peakPricePerKwh: number;
}

export class StationPricesDto {
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

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  @Max(BUSINESS_RULES.MAX_IDLE_FEE_PER_MIN)
  idleFeePerMin: number;

  @ApiProperty({ type: [PriceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceDto)
  prices: PriceDto[];
}

export class UpdateStationDto extends PartialType(CreateStationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StationSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ConnectorType })
  @IsOptional()
  @IsEnum(ConnectorType)
  connector?: ConnectorType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ description: 'true = management view (admin: all stations, station owner: own stations, including inactive)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  manage?: boolean;
}
