import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { MaintenancesService } from './maintenances.service';

@ApiTags('Maintenances')
@ApiBearerAuth()
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateMaintenanceDto) {
    return this.maintenances.create(dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll() {
    return this.maintenances.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('active')
  findActive() {
    return this.maintenances.findActive();
  }

  /** Technician: maintenances assigned to me (with vehicle and workshop). */
  @Roles(Role.TECHNICIAN)
  @Get('my')
  findMine(@CurrentUser() user: AuthUser) {
    return this.maintenances.findAssignedTo(user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('vehicle/:vehicleId')
  findByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenances.findByVehicle(vehicleId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('vehicle/:vehicleId/history')
  history(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenances.getVehicleHistory(vehicleId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('mechanic/:mechanicId')
  findByMechanic(@Param('mechanicId', ParseIntPipe) mechanicId: number) {
    return this.maintenances.findByMechanic(mechanicId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.maintenances.findOne(id, user);
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenances.updateStatus(id, dto, user);
  }
}
