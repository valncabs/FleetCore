import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleStatus } from '../common/enums';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(@InjectRepository(Vehicle) private readonly repo: Repository<Vehicle>) {}

  async create(dto: CreateVehicleDto) {
    await this.assertPlateIsFree(dto.plate);
    return this.repo.save(this.repo.create({ ...dto, status: dto.status ?? VehicleStatus.AVAILABLE }));
  }

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const vehicle = await this.repo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException(`Vehicle with id ${id} not found`);
    return vehicle;
  }

  async findByPlate(plate: string) {
    const vehicle = await this.repo.findOne({ where: { plate: plate.trim().toUpperCase() } });
    if (!vehicle) throw new NotFoundException(`Vehicle with plate ${plate} not found`);
    return vehicle;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);

    if (dto.plate && dto.plate !== vehicle.plate) await this.assertPlateIsFree(dto.plate);
    if (dto.mileage !== undefined && dto.mileage < vehicle.mileage) {
      throw new BadRequestException(`Mileage cannot decrease (current: ${vehicle.mileage})`);
    }
    // While IN_MAINTENANCE the status belongs to the maintenance workflow.
    if (dto.status && dto.status !== vehicle.status && vehicle.status === VehicleStatus.IN_MAINTENANCE) {
      throw new ConflictException('Cannot change the status of a vehicle that is in maintenance');
    }

    Object.assign(vehicle, dto);
    return this.repo.save(vehicle);
  }

  /** Logical deletion: the vehicle is marked INACTIVE so maintenance history is preserved. */
  async deactivate(id: number) {
    const vehicle = await this.findOne(id);
    if (vehicle.status === VehicleStatus.IN_MAINTENANCE) {
      throw new ConflictException(`Vehicle ${vehicle.plate} is in maintenance and cannot be deactivated`);
    }
    vehicle.status = VehicleStatus.INACTIVE;
    return this.repo.save(vehicle);
  }

  async activate(id: number) {
    const vehicle = await this.findOne(id);
    if (vehicle.status === VehicleStatus.INACTIVE) {
      vehicle.status = VehicleStatus.AVAILABLE;
      return this.repo.save(vehicle);
    }
    return vehicle;
  }

  private async assertPlateIsFree(plate: string) {
    if (await this.repo.exists({ where: { plate } })) {
      throw new ConflictException(`A vehicle with plate ${plate} already exists`);
    }
  }
}
