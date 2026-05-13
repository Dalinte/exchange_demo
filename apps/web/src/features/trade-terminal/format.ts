export function priceDecimals(p: number): number {
  if (p >= 1000) return 2;
  if (p >= 100) return 2;
  if (p >= 1) return 3;
  return 4;
}

export function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPrice(p: number): string {
  return fmt(p, priceDecimals(p));
}

export function fmtSigned(n: number, d = 2): string {
  return (n >= 0 ? '+' : '') + fmt(n, d);
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export function timeOf(d: Date): string {
  return d.toTimeString().slice(0, 8);
}
