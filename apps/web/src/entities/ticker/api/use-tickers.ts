import { useQuery } from '@tanstack/react-query';
import { getTickers } from './tickers';
import { queryKeys } from '@/shared/api/query-keys';

export function useTickers() {
  return useQuery({
    queryKey: queryKeys.tickers.list(),
    queryFn: ({ signal }) => getTickers(signal),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useTickerBySymbol(symbol: string) {
  const { data, ...rest } = useTickers();
  const ticker = data?.find((t) => t.symbol === symbol);
  return { ...rest, data: ticker };
}

export function useTradingPairWithStats(symbol: string) {
  return useTickerBySymbol(symbol);
}
