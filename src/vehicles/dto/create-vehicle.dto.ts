import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleStatus } from '../../common/enums';

export class CreateVehicleDto {
  /** Unique license plate (stored in uppercase). @example ABC123 */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  plate: string;

  /** @example Chevrolet */
  @IsString()
  @IsNotEmpty()
  brand: string;

  /** @example NPR */
  @IsString()
  @IsNotEmpty()
  model: string;

  /** @example 2021 */
  @IsInt()
  @Min(1950)
  @Max(2100)
  year: number;

  /** Current odometer reading. @example 45000 */
  @IsInt()
  @Min(0)
  mileage: number;

  /** Only AVAILABLE or INACTIVE can be set manually; IN_MAINTENANCE is managed by maintenances. */
  @IsOptional()
  @IsIn([VehicleStatus.AVAILABLE, VehicleStatus.INACTIVE])
  status?: VehicleStatus;
}
