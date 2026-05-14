import { apiFetch } from '@/shared/api/client';

export async function resetAccount(): Promise<void> {
  await apiFetch('/account/reset', { method: 'POST' });
}
