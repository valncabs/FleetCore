import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  /** Argon2 hash. Never selected by default so it can't leak in responses. */
  @Column({ name: 'password_hash', type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: Role, default: Role.TECHNICIAN })
  role: Role;

  /** Set when the account was created/linked through Google OAuth 2.0. */
  @Column({ name: 'google_id', type: 'varchar', nullable: true, unique: true })
  googleId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
