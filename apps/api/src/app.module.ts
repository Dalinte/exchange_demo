import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnonymousUserMiddleware } from './auth/anonymous-user.middleware';
import { HealthController } from './health/health.controller';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { TradesModule } from './trades/trades.module';
import { TradingPairsModule } from './trading-pairs/trading-pairs.module';

@Module({
  imports: [
    PrismaModule,
    TradingPairsModule,
    AccountsModule,
    TradesModule,
    OrdersModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    AnonymousUserMiddleware,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AnonymousUserMiddleware)
      .exclude('health')
      .forRoutes('*');
  }
}
