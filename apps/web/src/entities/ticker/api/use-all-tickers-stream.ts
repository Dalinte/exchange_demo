import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TradingPairWithStats } from '@exchange/shared';
import { getWsClient } from '@/shared/ws/client';
import { queryKeys } from '@/shared/api/query-keys';
import { useTickers } from './use-tickers';

export function useAllTickersStream() {
  const { data: tickers } = useTickers();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tickers || tickers.length === 0) return;
    const client = getWsClient();
    const channels = tickers.map((ticker) => `ticker:${ticker.symbol}`);

    client.subscribe(channels);

    const unsubscribeHandler = client.onMessage((message) => {
      if (message.type !== 'ticker') return;
      queryClient.setQueryData<TradingPairWithStats[] | undefined>(
        queryKeys.tickers.list(),
        (old) => {
          if (!old) return old;
          const index = old.findIndex((ticker) => ticker.symbol === message.symbol);
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
      client.unsubscribe(channels);
    };
  }, [tickers, queryClient]);
}
