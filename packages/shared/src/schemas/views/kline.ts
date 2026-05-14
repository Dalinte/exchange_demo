import { z } from 'zod';
import { DecimalStringSchema } from '../common.js';

export const KlineIntervalSchema = z.enum(['1m', '5m', '15m', '1h', '4h', '1d']);
export type KlineInterval = z.infer<typeof KlineIntervalSchema>;

export const KlineSchema = z
  .object({
    openTime: z.number().int(),
    open: DecimalStringSchema,
    high: DecimalStringSchema,
    low: DecimalStringSchema,
    close: DecimalStringSchema,
    volume: DecimalStringSchema,
    closeTime: z.number().int(),
    quoteVolume: DecimalStringSchema,
    trades: z.number().int(),
  })
  .meta({ id: 'Kline' });

export const KlineListSchema = z.array(KlineSchema);

export type Kline = z.infer<typeof KlineSchema>;
export type KlineList = z.infer<typeof KlineListSchema>;
