import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { WorkshopStatus } from '../common/enums';
import { Maintenance } from '../maintenances/maintenance.entity';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  address!: string;

  @Column({ type: 'enum', enum: WorkshopStatus, default: WorkshopStatus.ACTIVE })
  status!: WorkshopStatus;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.workshop)
  maintenances!: Maintenance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
