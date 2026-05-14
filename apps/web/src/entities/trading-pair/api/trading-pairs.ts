import { TradingPairListSchema, type TradingPair } from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';

export async function getTradingPairs(signal?: AbortSignal): Promise<TradingPair[]> {
  const data = await apiFetch('/trading-pairs', { signal });
  return TradingPairListSchema.parse(data);
}
