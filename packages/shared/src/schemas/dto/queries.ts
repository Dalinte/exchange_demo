import { z } from 'zod';
import { OrderStatusSchema } from '../common.js';
import { KlineIntervalSchema } from '../views/kline.js';

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

export const GetKlinesQuerySchema = z
  .object({
    symbol: z
      .string()
      .min(1)
      .transform((s) => s.toUpperCase()),
    interval: KlineIntervalSchema,
    limit: z.coerce.number().int().positive().max(1000).default(500),
  })
  .meta({ id: 'GetKlinesQuery' });

export type GetTradesQuery = z.infer<typeof GetTradesQuerySchema>;
export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;
export type GetKlinesQuery = z.infer<typeof GetKlinesQuerySchema>;
