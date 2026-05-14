import { z } from 'zod';
import { OrderSideSchema, PositiveDecimalStringSchema } from '../common.js';

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

export type CreateMarketOrderDto = z.infer<typeof CreateMarketOrderSchema>;
export type CreateLimitOrderDto = z.infer<typeof CreateLimitOrderSchema>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
