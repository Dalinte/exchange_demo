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

export function formatSignedPercent(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function priceDecimals(value: string | number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 2;
  if (n >= 100) return 2;
  if (n >= 1) return 3;
  return 4;
}

export function formatPrice(value: string | number): string {
  return formatDecimal(value, priceDecimals(value));
}

export function formatTime(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 8);
}
