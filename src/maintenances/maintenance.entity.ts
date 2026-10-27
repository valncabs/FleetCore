import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MaintenanceStatus, MaintenanceType } from '../common/enums';
import { numericTransformer } from '../common/utils/numeric.transformer';
import { Mechanic } from '../mechanics/mechanic.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Workshop } from '../workshops/workshop.entity';

@Entity('maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column({ type: 'text' })
  description: string;

  /** Vehicle odometer reading at scheduling time. */
  @Column({ type: 'int' })
  mileage: number;

  /** Start of the scheduled slot ("scheduled date"). */
  @Column({ name: 'scheduled_date', type: 'timestamptz' })
  scheduledDate: Date;

  /** End of the scheduled slot; used to detect overlaps for a mechanic. */
  @Column({ name: 'scheduled_end_date', type: 'timestamptz' })
  scheduledEndDate: Date;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  // ---- closing information (required to reach COMPLETED) ----
  @Column({ name: 'work_done', type: 'text', nullable: true })
  workDone: string | null;

  @Column({ name: 'final_cost', type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: numericTransformer })
  finalCost: number | null;

  @Column({ name: 'final_mileage', type: 'int', nullable: true })
  finalMileage: number | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // RESTRICT: history must never disappear because a related record is deleted.
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances, { nullable: false, onDelete: 'RESTRICT' })
  vehicle: Vehicle;

  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances, { nullable: false, onDelete: 'RESTRICT' })
  mechanic: Mechanic;

  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances, { nullable: false, onDelete: 'RESTRICT' })
  workshop: Workshop;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
