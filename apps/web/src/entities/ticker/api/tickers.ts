import { TradingPairWithStatsListSchema, type TradingPairWithStats } from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';

export async function getTickers(signal?: AbortSignal): Promise<TradingPairWithStats[]> {
  const data = await apiFetch('/tickers', { signal });
  return TradingPairWithStatsListSchema.parse(data);
}
