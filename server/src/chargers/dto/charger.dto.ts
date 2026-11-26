import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, Matches, Max, Min } from 'class-validator';
import { ConnectorType } from '../../generated/prisma/enums';

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
}

export class ChargerActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
