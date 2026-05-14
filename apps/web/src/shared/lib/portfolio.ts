import Decimal from 'decimal.js';
import type { BalanceMap } from '@exchange/shared';

export function calculateTotalEquityUsdt(balances: BalanceMap | undefined): string {
  if (!balances) return '0';
  const total = Object.values(balances).reduce(
    (sum, b) => sum.plus(b.valueUsdt),
    new Decimal(0),
  );
  return total.toString();
}
