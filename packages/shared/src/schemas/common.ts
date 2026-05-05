import { z } from 'zod';

export const DecimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a decimal string with digits and optional fraction')
  .meta({
    description:
      'Non-negative decimal as string to preserve precision (Decimal(36, 18) on the wire).',
    example: '10000.5',
  });

export const PositiveDecimalStringSchema = DecimalStringSchema.refine(
  (s) => /[1-9]/.test(s),
  'Must be greater than zero',
).meta({
  description: 'Strictly positive decimal as string.',
  example: '0.01',
});

export const UuidSchema = z.uuid().meta({
  description: 'UUID v4',
  example: '00000000-0000-4000-8000-000000000000',
});

export const TimestampSchema = z.iso.datetime().meta({
  description: 'ISO 8601 timestamp.',
  example: '2026-05-05T12:00:00.000Z',
});

export const AccountTypeSchema = z.enum(['SPOT']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderTypeSchema = z.enum(['MARKET', 'LIMIT']);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const OrderStatusSchema = z.enum([
  'PENDING',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELED',
  'REJECTED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export type DecimalString = z.infer<typeof DecimalStringSchema>;
