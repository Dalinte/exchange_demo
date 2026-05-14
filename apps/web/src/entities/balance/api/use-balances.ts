import { useQuery } from '@tanstack/react-query';
import { getBalances } from './balances';
import { queryKeys } from '@/shared/api/query-keys';

export function useBalances() {
  return useQuery({
    queryKey: queryKeys.balances.list(),
    queryFn: ({ signal }) => getBalances(signal),
  });
}
