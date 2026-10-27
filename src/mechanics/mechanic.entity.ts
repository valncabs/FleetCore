import {
  Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { MechanicStatus } from '../common/enums';
import { Maintenance } from '../maintenances/maintenance.entity';
import { User } from '../users/user.entity';

/** A mechanic is NOT tied to a workshop: the workshop is chosen per maintenance. */
@Entity('mechanics')
export class Mechanic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  specialty: string;

  @Column({ type: 'enum', enum: MechanicStatus, default: MechanicStatus.ACTIVE })
  status: MechanicStatus;

  /** Optional link to the TECHNICIAN user who logs in as this mechanic. */
  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.mechanic)
  maintenances: Maintenance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
