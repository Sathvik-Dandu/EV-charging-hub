import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ROLES } from '../../common/business-rules';
import { NAME_MESSAGE, NAME_REGEX, PASSWORD_MESSAGE, PASSWORD_REGEX, PHONE_MESSAGE, PHONE_REGEX } from '../../common/validation';

export class CreateUserDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(NAME_REGEX, { message: NAME_MESSAGE })
  fullName: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiProperty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({ enum: Object.values(ROLES) })
  @IsIn(Object.values(ROLES))
  role: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organization?: string;
}

export class RejectUserDto {
  @ApiProperty({ example: 'Business details could not be verified' })
  @IsString()
  @MinLength(5, { message: 'Give a reason of at least 5 characters' })
  @MaxLength(300)
  reason: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Object.values(ROLES) })
  @IsIn(Object.values(ROLES))
  role: string;
}

export class UpdateUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
