import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ type: 'enum', enum: Role, default: Role.TECHNICIAN })
  role!: Role;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

}

