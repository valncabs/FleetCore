import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WorkshopStatus } from '../../common/enums';

export class CreateWorkshopDto {
  /** @example Taller Centro */
  @IsString()
  @IsNotEmpty()
  name: string;

  /** @example Calle 45 # 12-30, Barranquilla */
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsEnum(WorkshopStatus)
  status?: WorkshopStatus;
}
