import { apiFetch } from './client';

export async function resetAccount(): Promise<void> {
  await apiFetch('/account/reset', { method: 'POST' });
}
