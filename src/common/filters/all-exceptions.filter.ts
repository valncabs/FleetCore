import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Global exception filter. Every error leaves the API with the same shape:
 * { success, statusCode, message, path, timestamp }.
 * Known PostgreSQL errors are mapped to proper HTTP codes so they never surface as a 500:
 *   23505 unique_violation -> 409, 23503 foreign_key_violation -> 409,
 *   23502 not_null_violation / 22P02 invalid_text_representation -> 400.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const raw = (body as any).message ?? exception.message;
        if (Array.isArray(raw)) {
          message = 'Validation failed';
          details = raw;
        } else {
          message = raw;
        }
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError: any = (exception as any).driverError ?? exception;
      switch (driverError.code) {
        case '23505':
          status = HttpStatus.CONFLICT;
          message = `Duplicate value: ${driverError.detail ?? 'a record with the same unique value already exists'}`;
          break;
        case '23503':
          status = HttpStatus.CONFLICT;
          message = `Operation violates a relation with other records: ${driverError.detail ?? ''}`.trim();
          break;
        case '23502':
        case '22P02':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid data supplied';
          break;
        default:
          this.logger.error(exception.message, exception.stack);
      }
    } else {
      this.logger.error(String(exception), exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
