import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AccountController } from './account/account.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnonymousUserMiddleware } from './auth/anonymous-user.middleware';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, HealthController, AccountController],
  providers: [AppService, AnonymousUserMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AnonymousUserMiddleware)
      .exclude('health')
      .forRoutes('*');
  }
}
