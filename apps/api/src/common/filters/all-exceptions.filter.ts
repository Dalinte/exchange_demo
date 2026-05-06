import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

interface ErrorBody {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp
      ? this.extractMessage(exception)
      : 'Internal server error';
    const error = STATUS_CODES[status] ?? 'Error';

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    if (status >= 500) {
      const err =
        exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `${req.method} ${req.url} - ${status} - ${err.message}`,
        err.stack,
      );
      if (process.env.NODE_ENV !== 'production' && err.stack) {
        body.stack = err.stack;
      }
    }

    res.status(status).json(body);
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null) {
      const { message } = response as { message?: unknown };
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join('; ');
    }
    return exception.message;
  }
}
