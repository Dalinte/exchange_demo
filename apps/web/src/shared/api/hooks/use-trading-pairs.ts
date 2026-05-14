import { useQuery } from '@tanstack/react-query';
import { getTradingPairs } from '../trading-pairs';
import { queryKeys } from '../query-keys';

export function useTradingPairs() {
  return useQuery({
    queryKey: queryKeys.tradingPairs.list(),
    queryFn: ({ signal }) => getTradingPairs(signal),
    staleTime: 5 * 60 * 1000,
  });
}
