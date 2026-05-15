export function isPositiveChange(priceChangePercent: string): boolean {
  const value = Number(priceChangePercent);
  return Number.isFinite(value) ? value >= 0 : true;
}
