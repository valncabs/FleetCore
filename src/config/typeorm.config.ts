import { DataSourceOptions } from 'typeorm';
import { Maintenance } from '../maintenances/maintenance.entity';
import { Mechanic } from '../mechanics/mechanic.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Workshop } from '../workshops/workshop.entity';

export const ENTITIES = [User, Vehicle, Mechanic, Workshop, Maintenance];

/** Shared by the Nest app and the seeder so both talk to the same database. */
export const buildTypeOrmOptions = (env: NodeJS.ProcessEnv): DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST ?? 'localhost',
  port: Number(env.DB_PORT ?? 5432),
  username: env.DB_USERNAME ?? 'postgres',
  password: env.DB_PASSWORD ?? 'postgres',
  database: env.DB_NAME ?? 'fleetcore',
  entities: ENTITIES,
  synchronize: env.DB_SYNC !== 'false', // development convenience; use migrations in production
});
