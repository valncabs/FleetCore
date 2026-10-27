import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VehicleStatus } from '../common/enums';
import { Maintenance } from '../maintenances/maintenance.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 20 })
  plate!: string;

  @Column()
  brand!: string;

  @Column()
  model!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int', default: 0 })
  mileage!: number;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  status!: VehicleStatus;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances!: Maintenance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
