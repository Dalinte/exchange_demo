import { Injectable } from '@nestjs/common';
import type { TradeView } from '@exchange/shared';
import type {
  Trade as PrismaTrade,
  TradingPair as PrismaTradingPair,
} from '../../generated/prisma/client';

type TradeWithPair = PrismaTrade & { tradingPair: PrismaTradingPair };

@Injectable()
export class TradeMapper {
  toView(trade: TradeWithPair): TradeView {
    return {
      id: trade.id,
      orderId: trade.orderId,
      symbol: trade.tradingPair.symbol,
      side: trade.side,
      quantity: trade.quantity.toString(),
      price: trade.price.toString(),
      quoteAmount: trade.quoteAmount.toString(),
      fee: trade.fee.toString(),
      feeAsset: trade.feeAsset,
      createdAt: trade.createdAt.toISOString(),
    };
  }

  toViewList(trades: TradeWithPair[]): TradeView[] {
    return trades.map((trade) => this.toView(trade));
  }
}
