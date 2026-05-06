import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggerInterceptor());
  app.enableShutdownHooks();

  setupSwagger(app);

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`Swagger UI:  http://localhost:${port}/api/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/api/docs-json`);
}
bootstrap();
