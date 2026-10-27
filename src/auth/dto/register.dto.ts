import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../common/enums';

export class RegisterDto {
  /** @example admin@fleetcore.com */
  @IsEmail()
  email!: string;

  /** Minimum 8 characters. @example Admin123! */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  /** Defaults to TECHNICIAN when omitted. */
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
