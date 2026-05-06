import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (req.url.startsWith('/api/docs')) {
      return next.handle();
    }

    const start = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} - ${res.statusCode} - ${duration}ms`);
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - start;
        const status = err instanceof HttpException ? err.getStatus() : 500;
        this.logger.log(`${method} ${url} - ${status} - ${duration}ms`);
        return throwError(() => err);
      }),
    );
  }
}
