import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role } from '../common/enums';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException(`A user with email ${email} already exists`);
    }
    // Passwords are never stored in plain text: argon2 hash only.
    const passwordHash = await argon2.hash(dto.password);
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
    // Same message for unknown user / wrong password / OAuth-only account (avoids user enumeration).
    const invalid = new UnauthorizedException('Invalid email or password');
    if (!user || !user.passwordHash) throw invalid;
    if (!(await argon2.verify(user.passwordHash, dto.password))) throw invalid;
    if (!user.isActive) throw new UnauthorizedException('User account is inactive');
    return this.buildAuthResponse(user);
  }

  /** Finds or creates the local user for a Google account and returns our own JWT. */
  async loginWithGoogle(profile: GoogleProfile) {
    if (!profile.email) throw new UnauthorizedException('Google account has no email');
    const email = profile.email.toLowerCase();

    let user = await this.users.findByGoogleId(profile.googleId);
    if (!user) {
      user = await this.users.findByEmail(email);
      if (user) {
        user.googleId = profile.googleId; // link existing local account
        user = await this.users.save(user);
      } else {
        // New OAuth users get the least-privileged operational role.
        user = await this.users.create({
          email,
          fullName: profile.fullName,
          googleId: profile.googleId,
          passwordHash: null,
          role: Role.TECHNICIAN,
        });
      }
    }
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
