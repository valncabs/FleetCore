import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ACTIVE_MAINTENANCE_STATUSES, MaintenanceStatus, MechanicStatus, Role, VehicleStatus, WorkshopStatus,
} from '../common/enums';
import { Mechanic } from '../mechanics/mechanic.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Workshop } from '../workshops/workshop.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { Maintenance } from './maintenance.entity';

const DEFAULT_DURATION_MINUTES = 60;
const RELATIONS = { vehicle: true, mechanic: true, workshop: true } as const;

/**
 * State machine. COMPLETED and CANCELLED are terminal, so a completed maintenance
 * can never go back and a cancelled one can never reach IN_PROGRESS / COMPLETED.
 */
const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.SCHEDULED]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.COMPLETED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

@Injectable()
export class MaintenancesService {
  constructor(
    @InjectRepository(Maintenance) private readonly repo: Repository<Maintenance>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Mechanic) private readonly mechanics: Repository<Mechanic>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ------------------------------------------------------------------ create

  /**
   * Creates a maintenance inside ONE transaction. The vehicle and mechanic rows are locked
   * (SELECT ... FOR UPDATE) so two concurrent requests cannot both pass the
   * "no active maintenance / no schedule overlap" checks and create a conflict.
   */
  async create(dto: CreateMaintenanceDto) {
    const start = new Date(dto.scheduledDate);
    const end = new Date(start.getTime() + (dto.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60_000);

    const createdId = await this.dataSource.transaction(async (manager) => {
      const vehicle = await manager
        .getRepository(Vehicle)
        .createQueryBuilder('vehicle')
        .setLock('pessimistic_write')
        .where('vehicle.id = :id', { id: dto.vehicleId })
        .getOne();
      if (!vehicle) throw new NotFoundException(`Vehicle with id ${dto.vehicleId} not found`);
      if (vehicle.status === VehicleStatus.INACTIVE) {
        throw new ConflictException(`Vehicle ${vehicle.plate} is INACTIVE and cannot receive maintenances`);
      }

      const mechanic = await manager
        .getRepository(Mechanic)
        .createQueryBuilder('mechanic')
        .setLock('pessimistic_write')
        .where('mechanic.id = :id', { id: dto.mechanicId })
        .getOne();
      if (!mechanic) throw new NotFoundException(`Mechanic with id ${dto.mechanicId} not found`);
      if (mechanic.status !== MechanicStatus.ACTIVE) {
        throw new ConflictException(`Mechanic ${mechanic.name} is INACTIVE and cannot be assigned`);
      }

      const workshop = await manager.findOne(Workshop, { where: { id: dto.workshopId } });
      if (!workshop) throw new NotFoundException(`Workshop with id ${dto.workshopId} not found`);
      if (workshop.status !== WorkshopStatus.ACTIVE) {
        throw new ConflictException(`Workshop ${workshop.name} is INACTIVE and cannot be assigned`);
      }

      if (dto.mileage < vehicle.mileage) {
        throw new BadRequestException(
          `Maintenance mileage (${dto.mileage}) cannot be lower than the vehicle's current mileage (${vehicle.mileage})`,
        );
      }

      // A vehicle can only have one active maintenance at a time.
      const vehicleHasActive = await manager.exists(Maintenance, {
        where: { vehicle: { id: vehicle.id }, status: In(ACTIVE_MAINTENANCE_STATUSES) },
      });
      if (vehicleHasActive) throw new ConflictException(`Vehicle ${vehicle.plate} already has an active maintenance`);

      // A mechanic cannot have overlapping active maintenances, in ANY workshop.
      // Slots that merely touch (one ends exactly when the other starts) are allowed.
      const overlapping = await this.findMechanicOverlap(manager, mechanic.id, start, end);
      if (overlapping) {
        throw new ConflictException(
          `Mechanic ${mechanic.name} already has maintenance #${overlapping.id} between ` +
            `${overlapping.scheduledDate.toISOString()} and ${overlapping.scheduledEndDate.toISOString()}`,
        );
      }

      const saved = await manager.save(
        manager.create(Maintenance, {
          type: dto.type,
          description: dto.description,
          mileage: dto.mileage,
          scheduledDate: start,
          scheduledEndDate: end,
          status: MaintenanceStatus.SCHEDULED, // initial state
          vehicle,
          mechanic,
          workshop,
        }),
      );
      return saved.id;
    });

    return this.loadOrFail(createdId);
  }

  // ------------------------------------------------------------ status change

  /**
   * Changes the status inside ONE transaction so the maintenance and the vehicle
   * (availability/mileage) are always updated together or not at all.
   * Technicians may only touch maintenances assigned to them.
   */
  async updateStatus(id: number, dto: UpdateMaintenanceStatusDto, actor: AuthUser) {
    await this.dataSource.transaction(async (manager) => {
      // Lock the row so concurrent status changes are serialized.
      const locked = await manager.findOne(Maintenance, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new NotFoundException(`Maintenance with id ${id} not found`);

      const maintenance = await manager.findOneOrFail(Maintenance, {
        where: { id },
        relations: { vehicle: true, mechanic: { user: true }, workshop: true },
      });

      if (actor.role === Role.TECHNICIAN && maintenance.mechanic.user?.id !== actor.id) {
        throw new ForbiddenException('You can only update maintenances assigned to you');
      }

      const from = maintenance.status;
      const to = dto.status;
      if (from === to) throw new ConflictException(`Maintenance #${id} is already ${from}`);
      if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        const allowed = ALLOWED_TRANSITIONS[from].join(', ') || 'none (terminal state)';
        throw new ConflictException(`Invalid status transition ${from} -> ${to}. Allowed from ${from}: ${allowed}`);
      }

      const vehicle = maintenance.vehicle;

      if (to === MaintenanceStatus.IN_PROGRESS) {
        if (vehicle.status !== VehicleStatus.AVAILABLE) {
          throw new ConflictException(`Vehicle ${vehicle.plate} is ${vehicle.status} and cannot enter maintenance`);
        }
        vehicle.status = VehicleStatus.IN_MAINTENANCE; // vehicle becomes unavailable
      }

      if (to === MaintenanceStatus.COMPLETED) {
        this.applyClosingData(maintenance, dto);
        vehicle.mileage = maintenance.finalMileage!;
        vehicle.status = VehicleStatus.AVAILABLE; // vehicle is available again
      }

      if (to === MaintenanceStatus.CANCELLED && vehicle.status === VehicleStatus.IN_MAINTENANCE) {
        vehicle.status = VehicleStatus.AVAILABLE; // cancelled while in progress frees the vehicle
      }

      maintenance.status = to;
      await manager.save(Vehicle, vehicle);
      await manager.save(Maintenance, { ...maintenance, vehicle: undefined, mechanic: undefined, workshop: undefined });
    });

    return this.loadOrFail(id);
  }

  /** Validates the mandatory closing information and copies it into the maintenance. */
  private applyClosingData(maintenance: Maintenance, dto: UpdateMaintenanceStatusDto) {
    const missing: string[] = [];
    if (!dto.workDone?.trim()) missing.push('workDone');
    if (dto.finalCost === undefined || dto.finalCost === null) missing.push('finalCost');
    if (!dto.completedAt) missing.push('completedAt');
    if (dto.finalMileage === undefined || dto.finalMileage === null) missing.push('finalMileage');
    if (missing.length) {
      throw new BadRequestException(`Cannot complete a maintenance without: ${missing.join(', ')}`);
    }

    const minimumMileage = Math.max(maintenance.mileage, maintenance.vehicle.mileage);
    if (dto.finalMileage! < minimumMileage) {
      throw new BadRequestException(
        `finalMileage (${dto.finalMileage}) cannot be lower than ${minimumMileage} (maintenance/vehicle mileage)`,
      );
    }

    maintenance.workDone = dto.workDone!.trim();
    maintenance.finalCost = dto.finalCost!;
    maintenance.completedAt = new Date(dto.completedAt!);
    maintenance.finalMileage = dto.finalMileage!;
  }

  private findMechanicOverlap(manager: EntityManager, mechanicId: number, start: Date, end: Date) {
    return manager
      .getRepository(Maintenance)
      .createQueryBuilder('m')
      .innerJoin('m.mechanic', 'mechanic')
      .where('mechanic.id = :mechanicId', { mechanicId })
      .andWhere('m.status IN (:...active)', { active: ACTIVE_MAINTENANCE_STATUSES })
      .andWhere('m.scheduledDate < :end AND m.scheduledEndDate > :start', { start, end })
      .getOne();
  }

  // ------------------------------------------------------------------ queries

  findAll() {
    return this.repo.find({ relations: RELATIONS, order: { scheduledDate: 'DESC' } });
  }

  findActive() {
    return this.repo.find({
      where: { status: In(ACTIVE_MAINTENANCE_STATUSES) },
      relations: RELATIONS,
      order: { scheduledDate: 'ASC' },
    });
  }

  async findByVehicle(vehicleId: number) {
    await this.ensureVehicleExists(vehicleId);
    return this.repo.find({
      where: { vehicle: { id: vehicleId } },
      relations: RELATIONS,
      order: { scheduledDate: 'DESC' },
    });
  }

  async findByMechanic(mechanicId: number) {
    if (!(await this.mechanics.exists({ where: { id: mechanicId } }))) {
      throw new NotFoundException(`Mechanic with id ${mechanicId} not found`);
    }
    return this.repo.find({
      where: { mechanic: { id: mechanicId } },
      relations: RELATIONS,
      order: { scheduledDate: 'DESC' },
    });
  }

  /** Maintenances assigned to the mechanic linked to the logged-in technician. */
  findAssignedTo(userId: number) {
    return this.repo.find({
      where: { mechanic: { user: { id: userId } } },
      relations: RELATIONS,
      order: { scheduledDate: 'ASC' },
    });
  }

  async findOne(id: number, actor: AuthUser) {
    const maintenance = await this.loadOrFail(id);
    if (actor.role === Role.TECHNICIAN) {
      const isAssigned = await this.repo.exists({ where: { id, mechanic: { user: { id: actor.id } } } });
      if (!isAssigned) throw new ForbiddenException('You can only view maintenances assigned to you');
    }
    return maintenance;
  }

  /** History = finished (COMPLETED) maintenances of a vehicle, newest first. */
  async getVehicleHistory(vehicleId: number) {
    const vehicle = await this.ensureVehicleExists(vehicleId);
    return this.buildHistory(vehicle);
  }

  async getHistoryByPlate(plate: string) {
    const vehicle = await this.vehicles.findOne({ where: { plate: plate.trim().toUpperCase() } });
    if (!vehicle) throw new NotFoundException(`Vehicle with plate ${plate} not found`);
    return this.buildHistory(vehicle);
  }

  private async buildHistory(vehicle: Vehicle) {
    const maintenances = await this.repo.find({
      where: { vehicle: { id: vehicle.id }, status: MaintenanceStatus.COMPLETED },
      relations: { mechanic: true, workshop: true },
      order: { completedAt: 'DESC' },
    });
    return {
      vehicle: {
        id: vehicle.id, plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model,
        year: vehicle.year, mileage: vehicle.mileage, status: vehicle.status,
      },
      maintenances,
    };
  }

  private async ensureVehicleExists(id: number) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException(`Vehicle with id ${id} not found`);
    return vehicle;
  }

  private async loadOrFail(id: number) {
    const maintenance = await this.repo.findOne({ where: { id }, relations: RELATIONS });
    if (!maintenance) throw new NotFoundException(`Maintenance with id ${id} not found`);
    return maintenance;
  }
}
