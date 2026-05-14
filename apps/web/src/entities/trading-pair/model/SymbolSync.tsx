'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useMarketStore } from './market-store';

export function SymbolSync() {
  const params = useParams<{ symbol?: string }>();
  const setSymbol = useMarketStore((s) => s.setSymbol);
  useEffect(() => {
    if (params?.symbol) setSymbol(params.symbol);
  }, [params?.symbol, setSymbol]);
  return null;
}
