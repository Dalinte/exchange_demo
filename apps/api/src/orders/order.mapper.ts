import { Injectable } from '@nestjs/common';
import type { OrderView } from '@exchange/shared';
import Decimal from 'decimal.js';
import type {
  Order as PrismaOrder,
  TradingPair as PrismaTradingPair,
} from '../../generated/prisma/client';

type OrderWithPair = PrismaOrder & { tradingPair: PrismaTradingPair };

@Injectable()
export class OrderMapper {
  toView(order: OrderWithPair): OrderView {
    return {
      id: order.id,
      symbol: order.tradingPair.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity.toString(),
      filledQuantity: order.filledQuantity.toString(),
      price: order.price?.toString() ?? null,
      averageFillPrice: order.averageFillPrice?.toString() ?? null,
      total: this.calculateTotal(order),
      createdAt: order.createdAt.toISOString(),
      filledAt: order.filledAt?.toISOString() ?? null,
    };
  }

  toViewList(orders: OrderWithPair[]): OrderView[] {
    return orders.map((order) => this.toView(order));
  }

  private calculateTotal(order: PrismaOrder): string {
    if (
      (order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED') &&
      order.averageFillPrice !== null
    ) {
      const filled = new Decimal(order.filledQuantity.toString());
      const price = new Decimal(order.averageFillPrice.toString());
      return filled.mul(price).toFixed();
    }
    if (
      order.type === 'LIMIT' &&
      order.status === 'PENDING' &&
      order.price !== null
    ) {
      const quantity = new Decimal(order.quantity.toString());
      const price = new Decimal(order.price.toString());
      return quantity.mul(price).toFixed();
    }
    return '0';
  }
}
