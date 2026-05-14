import { z } from 'zod';
import { DecimalStringSchema } from '../common.js';

export const TradingPairSchema = z
  .object({
    symbol: z.string().min(1),
    baseAsset: z.string().min(1),
    quoteAsset: z.string().min(1),
    pricePrecision: z.number().int().min(0),
    quantityPrecision: z.number().int().min(0),
    minQuantity: DecimalStringSchema,
  })
  .meta({ id: 'TradingPair' });

export const TradingPairListSchema = z.array(TradingPairSchema);

export const TradingPairWithStatsSchema = TradingPairSchema.extend({
  lastPrice: DecimalStringSchema,
  priceChangePercent24h: DecimalStringSchema,
  highPrice24h: DecimalStringSchema,
  lowPrice24h: DecimalStringSchema,
  volume24h: DecimalStringSchema,
  quoteVolume24h: DecimalStringSchema,
}).meta({ id: 'TradingPairWithStats' });

export const TradingPairWithStatsListSchema = z.array(TradingPairWithStatsSchema);

export type TradingPair = z.infer<typeof TradingPairSchema>;
export type TradingPairList = z.infer<typeof TradingPairListSchema>;
export type TradingPairWithStats = z.infer<typeof TradingPairWithStatsSchema>;
export type TradingPairWithStatsList = z.infer<typeof TradingPairWithStatsListSchema>;
