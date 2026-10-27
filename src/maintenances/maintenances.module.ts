import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mechanic } from '../mechanics/mechanic.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Workshop } from '../workshops/workshop.entity';
import { IntegrationsController } from './integrations.controller';
import { Maintenance } from './maintenance.entity';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';

@Module({
  imports: [TypeOrmModule.forFeature([Maintenance, Vehicle, Mechanic, Workshop])],
  controllers: [MaintenancesController, IntegrationsController],
  providers: [MaintenancesService],
})
export class MaintenancesModule {}
