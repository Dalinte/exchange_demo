import { useQuery } from '@tanstack/react-query';
import type { GetTradesQuery } from '@exchange/shared';
import { getTrades } from '../trades';
import { queryKeys } from '../query-keys';

export function useTrades(params: Partial<GetTradesQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.trades.list(params),
    queryFn: ({ signal }) => getTrades(params, signal),
  });
}

export function useTradeHistory(symbol?: string, limit = 50) {
  return useTrades({ symbol, limit });
}
