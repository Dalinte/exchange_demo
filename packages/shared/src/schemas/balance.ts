import { z } from 'zod';
import { DecimalStringSchema, TimestampSchema, UuidSchema } from './common.js';

export const BalanceSchema = z
  .object({
    id: UuidSchema,
    accountId: UuidSchema,
    asset: z.string().min(1),
    free: DecimalStringSchema,
    locked: DecimalStringSchema,
    updatedAt: TimestampSchema,
  })
  .meta({ id: 'Balance' });
export const BalanceListSchema = z.array(BalanceSchema);

export type Balance = z.infer<typeof BalanceSchema>;
export type BalanceList = z.infer<typeof BalanceListSchema>;
