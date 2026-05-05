import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

process.loadEnvFile('../../.env');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(process.env.API_PORT ?? 3001);
}
bootstrap();
