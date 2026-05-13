import { z } from 'zod';
import { DecimalStringSchema, OrderSideSchema, TimestampSchema, UuidSchema } from './common.js';

export const TradeSchema = z
  .object({
    id: UuidSchema,
    orderId: UuidSchema,
    accountId: UuidSchema,
    tradingPairId: UuidSchema,
    side: OrderSideSchema,
    quantity: DecimalStringSchema,
    price: DecimalStringSchema,
    quoteAmount: DecimalStringSchema,
    fee: DecimalStringSchema,
    feeAsset: z.string().min(1),
    createdAt: TimestampSchema,
  })
  .meta({ id: 'Trade' });
export const TradeListSchema = z.array(TradeSchema);

export type Trade = z.infer<typeof TradeSchema>;
export type TradeList = z.infer<typeof TradeListSchema>;
