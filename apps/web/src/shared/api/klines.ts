import { KlineListSchema, type Kline, type KlineInterval } from '@exchange/shared';
import { apiFetch } from './client';

export async function getKlines(
  symbol: string,
  interval: KlineInterval,
  limit: number,
  signal?: AbortSignal,
): Promise<Kline[]> {
  const data = await apiFetch('/klines', { query: { symbol, interval, limit }, signal });
  return KlineListSchema.parse(data);
}
