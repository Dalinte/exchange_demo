import { BalanceMapSchema, type BalanceMap } from '@exchange/shared';
import { apiFetch } from './client';

export async function getBalances(signal?: AbortSignal): Promise<BalanceMap> {
  const data = await apiFetch('/balances', { signal });
  return BalanceMapSchema.parse(data);
}
