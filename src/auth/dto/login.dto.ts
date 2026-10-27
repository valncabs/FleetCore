import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  /** @example admin@fleetcore.com */
  @IsEmail()
  email: string;

  /** @example Admin123! */
  @IsString()
  password: string;
}
