import { z } from 'zod';
import {
  DecimalStringSchema,
  OrderSideSchema,
  OrderStatusSchema,
  OrderTypeSchema,
  TimestampSchema,
  UuidSchema,
} from '../common.js';

export const OrderViewSchema = z
  .object({
    id: UuidSchema,
    symbol: z.string().min(1),
    side: OrderSideSchema,
    type: OrderTypeSchema,
    status: OrderStatusSchema,
    quantity: DecimalStringSchema,
    filledQuantity: DecimalStringSchema,
    price: DecimalStringSchema.nullable(),
    averageFillPrice: DecimalStringSchema.nullable(),
    total: DecimalStringSchema,
    createdAt: TimestampSchema,
    filledAt: TimestampSchema.nullable(),
  })
  .meta({ id: 'OrderView' });

export const OrderViewListSchema = z.array(OrderViewSchema);

export type OrderView = z.infer<typeof OrderViewSchema>;
export type OrderViewList = z.infer<typeof OrderViewListSchema>;
