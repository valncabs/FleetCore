import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard. Every route requires a valid JWT unless it is
 * decorated with @Public(). Gives descriptive 401 messages for the three
 * failure cases: missing, malformed/invalid and expired token.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') throw new UnauthorizedException('Token has expired');
      if (info?.name === 'JsonWebTokenError') throw new UnauthorizedException('Invalid token');
      throw new UnauthorizedException(err?.message ?? 'Authentication token is missing');
    }
    return user;
  }
}
