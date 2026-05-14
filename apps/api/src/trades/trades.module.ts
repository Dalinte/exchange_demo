import { Module } from '@nestjs/common';
import { TradeMapper } from './trade.mapper';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';

@Module({
  controllers: [TradesController],
  providers: [TradesService, TradeMapper],
})
export class TradesModule {}
