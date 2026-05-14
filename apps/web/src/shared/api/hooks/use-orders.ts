import { useQuery } from '@tanstack/react-query';
import type { GetOrdersQuery, OrderView } from '@exchange/shared';
import { getOrders } from '../orders';
import { queryKeys } from '../query-keys';

export function useOrders(params: Partial<GetOrdersQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: ({ signal }) => getOrders(params, signal),
  });
}

export function useOpenOrders(symbol?: string) {
  return useOrders({ status: 'PENDING', symbol });
}

export function useOrderHistory(symbol?: string, limit = 50) {
  const filled = useOrders({ status: 'FILLED', symbol, limit });
  const canceled = useOrders({ status: 'CANCELED', symbol, limit });

  const isLoading = filled.isLoading || canceled.isLoading;
  const isError = filled.isError || canceled.isError;
  const error = filled.error ?? canceled.error;

  const data: OrderView[] | undefined =
    filled.data && canceled.data
      ? [...filled.data, ...canceled.data]
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, limit)
      : undefined;

  return { data, isLoading, isError, error };
}
