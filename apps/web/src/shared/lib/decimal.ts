import Decimal from 'decimal.js';

export { Decimal };

export function parseDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function toFixedDown(value: Decimal | string, decimals: number): string {
  return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_DOWN).toFixed(decimals);
}
