import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BalanceMap,
  CreateOrderDto,
  OrderView,
  TradingPairWithStats,
} from '@exchange/shared';
import { createOrder } from '@/shared/api/orders';
import { queryKeys } from '@/shared/api/query-keys';
import { applyOptimisticMarketOrder } from '@/shared/lib/optimistic-balance';

interface CreateOrderContext {
  previousBalances: BalanceMap | undefined;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation<OrderView, unknown, CreateOrderDto, CreateOrderContext>({
    mutationFn: (dto) => createOrder(dto),
    onMutate: async (dto) => {
      if (dto.type !== 'MARKET') return { previousBalances: undefined };

      await queryClient.cancelQueries({ queryKey: queryKeys.balances.list() });
      const previousBalances = queryClient.getQueryData<BalanceMap>(queryKeys.balances.list());
      const tickers = queryClient.getQueryData<TradingPairWithStats[]>(queryKeys.tickers.list());
      const ticker = tickers?.find((t) => t.symbol === dto.symbol);

      if (previousBalances && ticker) {
        queryClient.setQueryData<BalanceMap>(
          queryKeys.balances.list(),
          applyOptimisticMarketOrder(previousBalances, dto, ticker),
        );
      }
      return { previousBalances };
    },
    onError: (_error, _dto, context) => {
      if (context?.previousBalances) {
        queryClient.setQueryData(queryKeys.balances.list(), context.previousBalances);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
    },
  });
}
