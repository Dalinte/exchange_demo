import { AccountSummarySchema, type AccountSummary } from '@exchange/shared';
import { apiFetch } from './client';

export async function getAccountSummary(signal?: AbortSignal): Promise<AccountSummary> {
  const data = await apiFetch('/account/me', { signal });
  return AccountSummarySchema.parse(data);
}

export async function resetAccount(): Promise<AccountSummary> {
  const data = await apiFetch('/account/reset', { method: 'POST' });
  return AccountSummarySchema.parse(data);
}
