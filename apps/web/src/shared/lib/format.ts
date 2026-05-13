export function formatDecimal(value: string | number, precision: number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export function formatCurrency(value: string, asset: string, precision = 2): string {
  return `${formatDecimal(value, precision)} ${asset}`;
}

export function formatPercent(value: number, signed = true): string {
  const fixed = value.toFixed(2);
  if (!signed) return `${fixed}%`;
  return value >= 0 ? `+${fixed}%` : `${fixed}%`;
}
