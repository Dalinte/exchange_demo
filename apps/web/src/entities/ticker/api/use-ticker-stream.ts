import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TradingPairWithStats } from '@exchange/shared';
import { getWsClient } from '@/shared/ws/client';
import { queryKeys } from '@/shared/api/query-keys';

export function useTickerStream(symbol: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!symbol) return;
    const client = getWsClient();
    const channel = `ticker:${symbol}`;

    client.subscribe([channel]);

    const unsubscribeHandler = client.onMessage((message) => {
      if (message.type !== 'ticker' || message.symbol !== symbol) return;
      queryClient.setQueryData<TradingPairWithStats[] | undefined>(
        queryKeys.tickers.list(),
        (old) => {
          if (!old) return old;
          const index = old.findIndex((t) => t.symbol === message.symbol);
          if (index === -1) return old;
          const next = old.slice();
          next[index] = {
            ...next[index],
            lastPrice: message.lastPrice,
            priceChangePercent24h: message.priceChangePercent24h,
            volume24h: message.volume24h,
          };
          return next;
        },
      );
    });

    return () => {
      unsubscribeHandler();
      client.unsubscribe([channel]);
    };
  }, [symbol, queryClient]);
}
