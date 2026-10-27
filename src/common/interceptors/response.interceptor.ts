import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

/**
 * Wraps every successful response in a uniform envelope and adds the HTTP code
 * spelled out in words (e.g. 200 -> "two zero zero").
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        data: data ?? null,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
