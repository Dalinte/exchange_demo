import type { TradingPair } from '@exchange/shared';

export function formatSymbolDisplay(symbol: string, quoteAsset: string): string {
  if (!symbol.endsWith(quoteAsset)) return symbol;
  const base = symbol.slice(0, -quoteAsset.length);
  return `${base}/${quoteAsset}`;
}

export function formatPairDisplay(pair: Pick<TradingPair, 'baseAsset' | 'quoteAsset'>): string {
  return `${pair.baseAsset}/${pair.quoteAsset}`;
}
