import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Kline, KlineInterval } from '@exchange/shared';
import { getWsClient } from '@/shared/ws/client';
import { queryKeys } from '@/shared/api/query-keys';

const MAX_CANDLES = 500;

export function useKlineStream(symbol: string, interval: KlineInterval) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!symbol) return;
    const client = getWsClient();
    const channel = `kline:${symbol}:${interval}`;

    client.subscribe([channel]);

    const unsubscribeHandler = client.onMessage((message) => {
      if (message.type !== 'kline') return;
      if (message.symbol !== symbol || message.interval !== interval) return;
      queryClient.setQueryData<Kline[] | undefined>(
        queryKeys.klines.list(symbol, interval),
        (old) => {
          if (!old || old.length === 0) return old;
          const last = old[old.length - 1];
          const update = message.data;
          if (last.openTime === update.openTime) {
            const next = old.slice();
            next[next.length - 1] = {
              ...last,
              open: update.open,
              high: update.high,
              low: update.low,
              close: update.close,
              volume: update.volume,
              closeTime: update.closeTime,
            };
            return next;
          }
          const appended: Kline = {
            openTime: update.openTime,
            open: update.open,
            high: update.high,
            low: update.low,
            close: update.close,
            volume: update.volume,
            closeTime: update.closeTime,
            quoteVolume: '0',
            trades: 0,
          };
          const trimmed = old.length >= MAX_CANDLES ? old.slice(-(MAX_CANDLES - 1)) : old;
          return [...trimmed, appended];
        },
      );
    });

    return () => {
      unsubscribeHandler();
      client.unsubscribe([channel]);
    };
  }, [symbol, interval, queryClient]);
}
