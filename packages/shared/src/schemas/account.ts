import { z } from 'zod';
import { AccountTypeSchema, DecimalStringSchema, TimestampSchema, UuidSchema } from './common.js';
import { BalanceSchema } from './balance.js';

export const AccountSchema = z
  .object({
    id: UuidSchema,
    userId: UuidSchema,
    type: AccountTypeSchema,
    createdAt: TimestampSchema,
  })
  .meta({ id: 'Account' });

export const AccountSummarySchema = AccountSchema.extend({
  balances: z.array(BalanceSchema),
  totalEquityUsdt: DecimalStringSchema.optional(),
}).meta({ id: 'AccountSummary' });

export type Account = z.infer<typeof AccountSchema>;
export type AccountSummary = z.infer<typeof AccountSummarySchema>;
