import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { MaintenanceType } from '../../common/enums';

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  /** @example Oil and filter change */
  @IsString()
  @IsNotEmpty()
  description!: string;

  /** Odometer reading; cannot be lower than the vehicle's current mileage. @example 45200 */
  @IsInt()
  @Min(0)
  mileage!: number;

  /** Start of the slot (ISO 8601). @example 2026-11-02T07:30:00.000Z */
  @IsDateString()
  scheduledDate!: string;

  /** Expected duration in minutes (default 60). Used to detect schedule overlaps. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsInt()
  vehicleId!: number;

  @IsInt()
  mechanicId!: number;

  @IsInt()
  workshopId!: number;
}
