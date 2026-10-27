import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Get()
  findAll() {
    return this.vehicles.findAll();
  }

  // Declared before ':id' so "plate" is not parsed as an id.
  @Get('plate/:plate')
  findByPlate(@Param('plate') plate: string) {
    return this.vehicles.findByPlate(plate);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicles.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.vehicles.activate(id);
  }

  /** Logical deletion (status -> INACTIVE). */
  @Roles(Role.ADMIN)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vehicles.deactivate(id);
  }
}
