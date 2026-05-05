import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [BinanceModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
