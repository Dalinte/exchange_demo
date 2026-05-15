import { z } from 'zod';
import { DecimalStringSchema } from './common.js';
import { BalanceItemSchema } from './views/balance.js';
import { OrderViewSchema } from './views/order.js';

const KlineDataSchema = z.object({
  open: DecimalStringSchema,
  high: DecimalStringSchema,
  low: DecimalStringSchema,
  close: DecimalStringSchema,
  volume: DecimalStringSchema,
  openTime: z.number().int(),
  closeTime: z.number().int(),
});

export const KlineUpdateSchema = z.object({
  type: z.literal('kline'),
  symbol: z.string(),
  interval: z.string(),
  data: KlineDataSchema,
});

export const TickerUpdateSchema = z.object({
  type: z.literal('ticker'),
  symbol: z.string(),
  lastPrice: DecimalStringSchema,
  priceChangePercent24h: DecimalStringSchema,
  volume24h: DecimalStringSchema,
});

export const OrderUpdateSchema = z.object({
  type: z.literal('order'),
  data: OrderViewSchema,
});

export const BalanceUpdateSchema = z.object({
  type: z.literal('balance'),
  data: BalanceItemSchema,
});

export const WSErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const PongMessageSchema = z.object({
  type: z.literal('pong'),
  t: z.number().int(),
});

export const WSMessageSchema = z.discriminatedUnion('type', [
  KlineUpdateSchema,
  TickerUpdateSchema,
  OrderUpdateSchema,
  BalanceUpdateSchema,
  WSErrorMessageSchema,
  PongMessageSchema,
]);

export type KlineUpdate = z.infer<typeof KlineUpdateSchema>;
export type TickerUpdate = z.infer<typeof TickerUpdateSchema>;
export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;
export type BalanceUpdate = z.infer<typeof BalanceUpdateSchema>;
export type WSErrorMessage = z.infer<typeof WSErrorMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type WSMessage = z.infer<typeof WSMessageSchema>;
