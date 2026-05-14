import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { TradingPairMapper } from './trading-pair.mapper';
import { TradingPairsController } from './trading-pairs.controller';
import { TradingPairsService } from './trading-pairs.service';

@Module({
  imports: [BinanceModule],
  controllers: [TradingPairsController],
  providers: [TradingPairsService, TradingPairMapper],
  exports: [TradingPairsService],
})
export class TradingPairsModule {}
