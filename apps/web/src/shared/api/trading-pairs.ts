import { TradingPairListSchema, type TradingPairList } from '@exchange/shared';
import { apiFetch } from './client';

export async function getTradingPairs(signal?: AbortSignal): Promise<TradingPairList> {
  const data = await apiFetch('/trading-pairs', { signal });
  return TradingPairListSchema.parse(data);
}
