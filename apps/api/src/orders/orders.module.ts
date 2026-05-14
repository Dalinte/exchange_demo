import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { OrderMapper } from './order.mapper';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [BinanceModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderMapper],
})
export class OrdersModule {}
