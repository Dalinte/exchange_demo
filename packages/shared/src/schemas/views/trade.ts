import { z } from 'zod';
import {
  DecimalStringSchema,
  OrderSideSchema,
  TimestampSchema,
  UuidSchema,
} from '../common.js';

export const TradeViewSchema = z
  .object({
    id: UuidSchema,
    orderId: UuidSchema,
    symbol: z.string().min(1),
    side: OrderSideSchema,
    quantity: DecimalStringSchema,
    price: DecimalStringSchema,
    quoteAmount: DecimalStringSchema,
    fee: DecimalStringSchema,
    feeAsset: z.string().min(1),
    createdAt: TimestampSchema,
  })
  .meta({ id: 'TradeView' });

export const TradeViewListSchema = z.array(TradeViewSchema);

export type TradeView = z.infer<typeof TradeViewSchema>;
export type TradeViewList = z.infer<typeof TradeViewListSchema>;
