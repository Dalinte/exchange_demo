import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { KlinesController } from './klines.controller';

@Module({
  imports: [BinanceModule],
  controllers: [KlinesController],
})
export class KlinesModule {}
