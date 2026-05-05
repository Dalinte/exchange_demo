import { Module } from '@nestjs/common';
import { BinancePriceService } from './binance-price.service';

@Module({
  providers: [BinancePriceService],
  exports: [BinancePriceService],
})
export class BinanceModule {}
