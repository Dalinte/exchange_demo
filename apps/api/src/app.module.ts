import { join } from 'node:path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { AccountsModule } from './accounts/accounts.module';
import { AnonymousUserMiddleware } from './auth/anonymous-user.middleware';
import { validateEnv } from './config/env.schema';
import { ExchangeModule } from './exchange/exchange.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { TradesModule } from './trades/trades.module';
import { TradingPairsModule } from './trading-pairs/trading-pairs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env')],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    TradingPairsModule,
    AccountsModule,
    TradesModule,
    OrdersModule,
    ExchangeModule,
  ],
  providers: [
    AnonymousUserMiddleware,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AnonymousUserMiddleware).exclude('health').forRoutes('*');
  }
}
