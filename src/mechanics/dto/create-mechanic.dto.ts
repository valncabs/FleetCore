import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MechanicStatus } from '../../common/enums';

export class CreateMechanicDto {
  /** @example Carlos Pérez */
  @IsString()
  @IsNotEmpty()
  name: string;

  /** @example carlos@fleetcore.com */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  /** @example Engine */
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @IsOptional()
  @IsEnum(MechanicStatus)
  status?: MechanicStatus;

  /** Id of the TECHNICIAN user that logs in as this mechanic (optional). */
  @IsOptional()
  @IsInt()
  userId?: number;
}
