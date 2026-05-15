import Decimal from 'decimal.js';

export { Decimal };

export function parseDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function safeDecimal(value: string): Decimal {
  if (!value) return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function toFixedDown(value: Decimal | string, decimals: number): string {
  return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_DOWN).toFixed(decimals);
}
