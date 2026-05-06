import { Module } from '@nestjs/common';
import { TradingPairsController } from './trading-pairs.controller';
import { TradingPairsService } from './trading-pairs.service';

@Module({
  controllers: [TradingPairsController],
  providers: [TradingPairsService],
  exports: [TradingPairsService],
})
export class TradingPairsModule {}
