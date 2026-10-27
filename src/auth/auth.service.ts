import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException(`A user with email ${email} already exists`);
    }
    // Passwords are never stored in plain text: bcrypt hash only.
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      email,
      fullName: dto.fullName,
      role: dto.role ?? Role.TECHNICIAN,
      passwordHash,
    });
    return this.publicUser(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email.toLowerCase());
    // Same message for unknown user / wrong password (avoids user enumeration).
    const invalid = new UnauthorizedException('Invalid email or password');
    if (!user || !user.passwordHash) throw invalid;
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) throw invalid;
    if (!user.isActive) throw new UnauthorizedException('User account is inactive');
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, tokenType: 'Bearer', user: this.publicUser(user) };
  }

  private publicUser(user: User) {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  }
}