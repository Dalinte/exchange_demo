import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { HealthController } from './health.controller';

@Module({
  imports: [BinanceModule],
  controllers: [HealthController],
})
export class HealthModule {}
