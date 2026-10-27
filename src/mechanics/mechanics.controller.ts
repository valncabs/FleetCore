import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { MechanicStatus, Role } from '../common/enums';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { MechanicsService } from './mechanics.service';

@ApiTags('Mechanics')
@ApiBearerAuth()
@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanics: MechanicsService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateMechanicDto) {
    return this.mechanics.create(dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll() {
    return this.mechanics.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mechanics.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMechanicDto) {
    return this.mechanics.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.mechanics.setStatus(id, MechanicStatus.ACTIVE);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.mechanics.setStatus(id, MechanicStatus.INACTIVE);
  }
}
