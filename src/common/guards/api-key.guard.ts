import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * Protects endpoints meant for external integrations. The key is read from the
 * `x-api-key` header and compared (in constant time) with the keys stored in the
 * API_KEYS environment variable. Use together with @Public() so the JWT guard is skipped.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validKeys: Buffer[];

  constructor(config: ConfigService) {
    this.validKeys = (config.get<string>('API_KEYS') ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
      .map((key) => Buffer.from(key));
  }

  canActivate(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest().headers['x-api-key'];
    const provided = Buffer.from(Array.isArray(header) ? header[0] : (header ?? ''));
    const isValid = this.validKeys.some((key) => key.length === provided.length && timingSafeEqual(key, provided));
    if (!isValid) throw new UnauthorizedException('Invalid or missing API key');
    return true;
  }
}
