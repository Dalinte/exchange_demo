import { Injectable } from '@nestjs/common';
import type { TradingPair, TradingPairWithStats } from '@exchange/shared';
import type { TradingPair as PrismaTradingPair } from '../../generated/prisma/client';
import type { BinanceTicker24h } from '../binance/binance-price.service';

@Injectable()
export class TradingPairMapper {
  toView(entity: PrismaTradingPair): TradingPair {
    return {
      symbol: entity.symbol,
      baseAsset: entity.baseAsset,
      quoteAsset: entity.quoteAsset,
      pricePrecision: entity.pricePrecision,
      quantityPrecision: entity.quantityPrecision,
      minQuantity: entity.minQuantity.toString(),
    };
  }

  toViewWithStats(
    entity: PrismaTradingPair,
    ticker: BinanceTicker24h,
  ): TradingPairWithStats {
    return {
      ...this.toView(entity),
      lastPrice: ticker.lastPrice,
      priceChangePercent24h: ticker.priceChangePercent,
      highPrice24h: ticker.highPrice,
      lowPrice24h: ticker.lowPrice,
      volume24h: ticker.volume,
      quoteVolume24h: ticker.quoteVolume,
    };
  }
}
