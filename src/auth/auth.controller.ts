import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Starts Google OAuth 2.0 login (open it in a browser, not in Swagger "Try it out")' })
  @Get('google')
  googleLogin() {
    // Passport redirects to Google; this body never runs.
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google redirects here; returns our JWT' })
  @Get('google/callback')
  googleCallback(@Req() req: any) {
    return this.auth.loginWithGoogle(req.user);
  }
}
