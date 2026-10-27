import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { MaintenancesService } from './maintenances.service';

/**
 * Endpoints for external integrations. @Public() skips the JWT guard and
 * ApiKeyGuard requires a valid `x-api-key` header instead.
 */
@ApiTags('Integrations (x-api-key)')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Get('vehicles/:plate/history')
  vehicleHistory(@Param('plate') plate: string) {
    return this.maintenances.getHistoryByPlate(plate);
  }
}
