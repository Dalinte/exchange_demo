import { z } from 'zod';
import {
  DecimalStringSchema,
  OrderSideSchema,
  OrderStatusSchema,
  OrderTypeSchema,
  PositiveDecimalStringSchema,
  TimestampSchema,
  UuidSchema,
} from './common.js';

export const OrderSchema = z
  .object({
    id: UuidSchema,
    accountId: UuidSchema,
    tradingPairId: UuidSchema,
    clientOrderId: z.string().nullable(),
    side: OrderSideSchema,
    type: OrderTypeSchema,
    status: OrderStatusSchema,
    quantity: DecimalStringSchema,
    filledQuantity: DecimalStringSchema,
    price: DecimalStringSchema.nullable(),
    averageFillPrice: DecimalStringSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    filledAt: TimestampSchema.nullable(),
  })
  .meta({ id: 'Order' });
export const OrderListSchema = z.array(OrderSchema);

export const CreateMarketOrderSchema = z
  .object({
    type: z.literal('MARKET'),
    symbol: z.string().min(1),
    side: OrderSideSchema,
    quantity: PositiveDecimalStringSchema,
  })
  .meta({ id: 'CreateMarketOrder' });

export const CreateLimitOrderSchema = z
  .object({
    type: z.literal('LIMIT'),
    symbol: z.string().min(1),
    side: OrderSideSchema,
    quantity: PositiveDecimalStringSchema,
    price: PositiveDecimalStringSchema,
  })
  .meta({ id: 'CreateLimitOrder' });

export const CreateOrderSchema = z
  .discriminatedUnion('type', [CreateMarketOrderSchema, CreateLimitOrderSchema])
  .meta({ id: 'CreateOrder' });

export type Order = z.infer<typeof OrderSchema>;
export type OrderList = z.infer<typeof OrderListSchema>;
export type CreateMarketOrderDto = z.infer<typeof CreateMarketOrderSchema>;
export type CreateLimitOrderDto = z.infer<typeof CreateLimitOrderSchema>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
