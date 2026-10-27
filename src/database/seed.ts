import 'reflect-metadata';
import 'dotenv/config';
import * as argon2 from 'argon2';
import { DataSource, DeepPartial, EntityTarget, ObjectLiteral } from 'typeorm';
import {
  MaintenanceStatus, MaintenanceType, MechanicStatus, Role, VehicleStatus, WorkshopStatus,
} from '../common/enums';
import { buildTypeOrmOptions } from '../config/typeorm.config';
import { Maintenance } from '../maintenances/maintenance.entity';
import { Mechanic } from '../mechanics/mechanic.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Workshop } from '../workshops/workshop.entity';

/** Idempotent helper: returns the existing row matching `where`, or creates it. */
async function findOrCreate<T extends ObjectLiteral>(
  ds: DataSource, entity: EntityTarget<T>, where: any, data: DeepPartial<T>,
): Promise<T> {
  const repo = ds.getRepository(entity);
  const existing = await repo.findOne({ where });
  if (existing) return existing;
  return repo.save(repo.create(data));
}

const hours = (iso: string, durationHours: number) => {
  const start = new Date(iso);
  return { start, end: new Date(start.getTime() + durationHours * 3_600_000) };
};

async function seed() {
  const ds = new DataSource(buildTypeOrmOptions(process.env));
  await ds.initialize();
  await ds.synchronize(); // make sure tables exist even if DB_SYNC=false

  // ---- users: 1 ADMIN, 2 TECHNICIAN (+1 MANAGER to test that role) ----
  const mkUser = async (email: string, fullName: string, role: Role, password: string) =>
    findOrCreate(ds, User, { email }, { email, fullName, role, passwordHash: await argon2.hash(password) });

  await mkUser('admin@fleetcore.com', 'Ana Admin', Role.ADMIN, 'Admin123!');
  const tech1 = await mkUser('tech1@fleetcore.com', 'Carlos Pérez', Role.TECHNICIAN, 'Tech123!');
  const tech2 = await mkUser('tech2@fleetcore.com', 'Laura Gómez', Role.TECHNICIAN, 'Tech123!');
  await mkUser('manager@fleetcore.com', 'Mario Manager', Role.MANAGER, 'Manager123!');

  // ---- mechanics: 2 active (linked to technicians) + 1 inactive ----
  const mech1 = await findOrCreate(ds, Mechanic, { email: 'carlos.perez@fleetcore.com' }, {
    name: 'Carlos Pérez', email: 'carlos.perez@fleetcore.com', specialty: 'Engine',
    status: MechanicStatus.ACTIVE, user: tech1,
  });
  const mech2 = await findOrCreate(ds, Mechanic, { email: 'laura.gomez@fleetcore.com' }, {
    name: 'Laura Gómez', email: 'laura.gomez@fleetcore.com', specialty: 'Brakes',
    status: MechanicStatus.ACTIVE, user: tech2,
  });
  await findOrCreate(ds, Mechanic, { email: 'pedro.ruiz@fleetcore.com' }, {
    name: 'Pedro Ruiz', email: 'pedro.ruiz@fleetcore.com', specialty: 'Electrical',
    status: MechanicStatus.INACTIVE, user: null,
  });

  // ---- workshops: 1 active + 1 inactive ----
  const workshopCenter = await findOrCreate(ds, Workshop, { name: 'Taller Centro' }, {
    name: 'Taller Centro', address: 'Calle 45 # 12-30, Barranquilla', status: WorkshopStatus.ACTIVE,
  });
  await findOrCreate(ds, Workshop, { name: 'Taller Norte' }, {
    name: 'Taller Norte', address: 'Carrera 51B # 80-10, Barranquilla', status: WorkshopStatus.INACTIVE,
  });

  // ---- vehicles: 2 AVAILABLE, 1 IN_MAINTENANCE, 1 INACTIVE ----
  const v1 = await findOrCreate(ds, Vehicle, { plate: 'ABC123' }, {
    plate: 'ABC123', brand: 'Chevrolet', model: 'NPR', year: 2021, mileage: 45000, status: VehicleStatus.AVAILABLE,
  });
  const v2 = await findOrCreate(ds, Vehicle, { plate: 'DEF456' }, {
    plate: 'DEF456', brand: 'Hino', model: '300', year: 2022, mileage: 30000, status: VehicleStatus.AVAILABLE,
  });
  const v3 = await findOrCreate(ds, Vehicle, { plate: 'GHI789' }, {
    plate: 'GHI789', brand: 'Isuzu', model: 'ELF', year: 2020, mileage: 52000, status: VehicleStatus.IN_MAINTENANCE,
  });
  await findOrCreate(ds, Vehicle, { plate: 'JKL012' }, {
    plate: 'JKL012', brand: 'Kia', model: 'K2700', year: 2015, mileage: 180000, status: VehicleStatus.INACTIVE,
  });

  // ---- maintenances (idempotent by vehicle + description) ----
  const done = hours('2026-09-15T08:00:00Z', 2);
  await findOrCreate(ds, Maintenance, { description: 'Oil and filter change', vehicle: { id: v1.id } }, {
    type: MaintenanceType.PREVENTIVE, description: 'Oil and filter change', mileage: 44800,
    scheduledDate: done.start, scheduledEndDate: done.end, status: MaintenanceStatus.COMPLETED,
    workDone: 'Changed engine oil, oil filter and air filter', finalCost: 350000, finalMileage: 45000,
    completedAt: new Date('2026-09-15T10:00:00Z'), vehicle: v1, mechanic: mech1, workshop: workshopCenter,
  });

  const running = hours('2026-10-27T07:30:00Z', 2);
  await findOrCreate(ds, Maintenance, { description: 'Brake pads replacement', vehicle: { id: v3.id } }, {
    type: MaintenanceType.CORRECTIVE, description: 'Brake pads replacement', mileage: 52000,
    scheduledDate: running.start, scheduledEndDate: running.end, status: MaintenanceStatus.IN_PROGRESS,
    vehicle: v3, mechanic: mech2, workshop: workshopCenter,
  });

  // Extra: a SCHEDULED one so a technician can try the SCHEDULED -> IN_PROGRESS flow.
  const planned = hours('2026-11-02T07:30:00Z', 1.5);
  await findOrCreate(ds, Maintenance, { description: 'Scheduled 30k km service', vehicle: { id: v2.id } }, {
    type: MaintenanceType.PREVENTIVE, description: 'Scheduled 30k km service', mileage: 30000,
    scheduledDate: planned.start, scheduledEndDate: planned.end, status: MaintenanceStatus.SCHEDULED,
    vehicle: v2, mechanic: mech1, workshop: workshopCenter,
  });

  console.log('Seed finished (safe to run again: existing records are not duplicated).');
  await ds.destroy();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
