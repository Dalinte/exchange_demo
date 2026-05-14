import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { BalanceMapper } from './balance.mapper';
import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';

@Module({
  imports: [BinanceModule],
  controllers: [BalancesController],
  providers: [BalancesService, BalanceMapper],
})
export class BalancesModule {}
