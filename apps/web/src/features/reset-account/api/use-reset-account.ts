import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resetAccount } from './reset-account';

export function useResetAccount() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () => resetAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
