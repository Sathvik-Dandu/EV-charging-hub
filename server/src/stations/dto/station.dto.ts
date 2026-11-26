import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ConnectorType } from '../../generated/prisma/enums';

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

  @ApiProperty({ example: 1 })
  @IsInt()
  tariffId: number;
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
