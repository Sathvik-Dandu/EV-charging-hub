import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EnquiryCategory, EnquiryStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateEnquiryDto {
  @ApiProperty({ enum: EnquiryCategory })
  @IsEnum(EnquiryCategory)
  category: EnquiryCategory;

  @ApiProperty({ example: 'Charged twice for one session' })
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'Subject must have at least 5 characters' })
  @MaxLength(120)
  subject: string;

  @ApiProperty({ example: 'My invoice INV-... shows the idle fee even though I unplugged on time.' })
  @Transform(trim)
  @IsString()
  @MinLength(20, { message: 'Message must have at least 20 characters' })
  @MaxLength(1000)
  message: string;
}

export class ReplyEnquiryDto {
  @ApiProperty({ enum: EnquiryStatus })
  @IsEnum(EnquiryStatus)
  status: EnquiryStatus;

  @ApiPropertyOptional({ example: 'We have refunded the idle fee to your account.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'Reply must have at least 5 characters' })
  @MaxLength(1000)
  reply?: string;
}
