import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaintenanceStatus } from '../../common/enums';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  // ---- Required only when status = COMPLETED ----

  /** Work performed. @example Changed oil, oil filter and air filter */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workDone?: string;

  /** Final cost. @example 350000 */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalCost?: number;

  /** Completion date (ISO 8601). @example 2026-11-02T09:00:00.000Z */
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  /** Final odometer reading. @example 45230 */
  @IsOptional()
  @IsInt()
  @Min(0)
  finalMileage?: number;
}
