'use client';

import { useTickerStream } from './use-ticker-stream';

export function TickerSubscription({ symbol }: { symbol: string }) {
  useTickerStream(symbol);
  return null;
}
