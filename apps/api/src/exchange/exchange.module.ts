import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { TradingPairsModule } from '../trading-pairs/trading-pairs.module';
import { ExchangeGateway } from './exchange.gateway';

@Module({
  imports: [BinanceModule, TradingPairsModule],
  providers: [ExchangeGateway],
})
export class ExchangeModule {}
