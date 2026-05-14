import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderView } from '@exchange/shared';
import { cancelOrder } from '@/shared/api/orders';
import { queryKeys } from '@/shared/api/query-keys';

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation<OrderView, unknown, string>({
    mutationFn: (orderId) => cancelOrder(orderId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances.all });
    },
  });
}
