import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { ConnectorType } from '../../generated/prisma/enums';

export class CreateVehicleDto {
  @ApiProperty({ example: 'KA01AB1234' })
  @Matches(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/, { message: 'Registration number must look like KA01AB1234' })
  registrationNo: string;

  @ApiProperty({ example: 'Tata' })
  @IsString()
  @MinLength(2)
  make: string;

  @ApiProperty({ example: 'Nexon EV' })
  @IsString()
  @MinLength(1)
  model: string;

  @ApiProperty({ enum: ConnectorType })
  @IsEnum(ConnectorType)
  connectorType: ConnectorType;

  @ApiProperty({ example: 40.5 })
  @IsNumber()
  @Min(5)
  @Max(200)
  batteryKwh: number;
}
