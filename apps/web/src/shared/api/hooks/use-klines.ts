import { useQuery } from '@tanstack/react-query';
import { getKlines } from '../klines';
import { queryKeys } from '../query-keys';
import type { KlineInterval } from '@exchange/shared';

export function useKlines(symbol: string | undefined, interval: KlineInterval) {
  return useQuery({
    queryKey: queryKeys.klines.list(symbol ?? '', interval),
    enabled: !!symbol,
    queryFn: ({ signal }) => getKlines(symbol!, interval, 200, signal),
    staleTime: 60_000,
  });
}
