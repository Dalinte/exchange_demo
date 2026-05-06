import { Module } from '@nestjs/common';
import { BinancePriceService } from './binance-price.service';
import { BinanceStreamService } from './binance-stream.service';

@Module({
  providers: [BinancePriceService, BinanceStreamService],
  exports: [BinancePriceService, BinanceStreamService],
})
export class BinanceModule {}
