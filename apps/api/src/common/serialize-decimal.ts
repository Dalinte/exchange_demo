import { Prisma } from '../../generated/prisma/client';

// Рекурсивно превращает Prisma.Decimal в строку и Date в ISO,
// чтобы JSON-ответ соответствовал DecimalStringSchema/TimestampSchema из @exchange/shared.
export function serializeDecimal<T>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeDecimal);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeDecimal(v);
    }
    return out;
  }
  return value;
}
