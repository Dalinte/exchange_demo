import { z } from 'zod';
import { OrderStatusSchema } from './common.js';

const LimitSchema = z.coerce.number().int().min(1).max(200).default(50);

const SymbolFilterSchema = z
  .string()
  .min(1)
  .transform((s) => s.toUpperCase())
  .optional();

export const GetTradesQuerySchema = z
  .object({
    symbol: SymbolFilterSchema,
    limit: LimitSchema,
  })
  .meta({ id: 'GetTradesQuery' });

export const GetOrdersQuerySchema = z
  .object({
    status: OrderStatusSchema.optional(),
    symbol: SymbolFilterSchema,
    limit: LimitSchema,
  })
  .meta({ id: 'GetOrdersQuery' });

export type GetTradesQuery = z.infer<typeof GetTradesQuerySchema>;
export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;
