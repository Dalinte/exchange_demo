import { z } from 'zod';
import { DecimalStringSchema, UuidSchema } from './common.js';

export const TradingPairSchema = z
  .object({
    id: UuidSchema,
    symbol: z.string().min(1),
    baseAsset: z.string().min(1),
    quoteAsset: z.string().min(1),
    pricePrecision: z.number().int().min(0),
    quantityPrecision: z.number().int().min(0),
    minQuantity: DecimalStringSchema,
    isActive: z.boolean(),
  })
  .meta({ id: 'TradingPair' });
export const TradingPairListSchema = z.array(TradingPairSchema);

export type TradingPair = z.infer<typeof TradingPairSchema>;
export type TradingPairList = z.infer<typeof TradingPairListSchema>;
