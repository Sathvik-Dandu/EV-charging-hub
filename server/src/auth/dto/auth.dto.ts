import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SELF_SIGNUP_ROLES } from '../../common/business-rules';
import { NAME_MESSAGE, NAME_REGEX, PASSWORD_MESSAGE, PASSWORD_REGEX, PHONE_MESSAGE, PHONE_REGEX } from '../../common/validation';

const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class RegisterDto {
  @ApiProperty({ example: 'Asha Verma' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(NAME_REGEX, { message: NAME_MESSAGE })
  fullName: string;

  @ApiProperty({ example: 'asha@example.com' })
  @Transform(trimLower)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ example: '9876543210', required: false })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiProperty({ example: 'Password@123' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({ enum: SELF_SIGNUP_ROLES, required: false, default: 'EV_OWNER' })
  @IsOptional()
  @IsIn(SELF_SIGNUP_ROLES, { message: 'You can sign up as an EV owner, station owner or technician' })
  role?: string;

  @ApiProperty({ example: 'Green Parks Pvt Ltd', required: false, description: 'Business name (required for station owners)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organization?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@evhub.com' })
  @Transform(trimLower)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsNotEmpty()
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsNotEmpty()
  refreshToken: string;
}
