import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

/** Injects the authenticated user (set by the JWT strategy) into a handler parameter. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
