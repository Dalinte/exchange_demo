import { z } from 'zod';
import { DecimalStringSchema } from '../common.js';

export const BalanceItemSchema = z
  .object({
    asset: z.string().min(1),
    free: DecimalStringSchema,
    locked: DecimalStringSchema,
    total: DecimalStringSchema,
    valueUsdt: DecimalStringSchema,
  })
  .meta({ id: 'BalanceItem' });

export const BalanceMapSchema = z
  .record(z.string(), BalanceItemSchema)
  .meta({ id: 'BalanceMap' });

export type BalanceItem = z.infer<typeof BalanceItemSchema>;
export type BalanceMap = z.infer<typeof BalanceMapSchema>;
