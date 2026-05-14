import {
  TradingPairListSchema,
  TradingPairWithStatsListSchema,
  type TradingPair,
  type TradingPairWithStats,
} from '@exchange/shared';
import { apiFetch } from './client';

export async function getTradingPairs(signal?: AbortSignal): Promise<TradingPair[]> {
  const data = await apiFetch('/trading-pairs', { signal });
  return TradingPairListSchema.parse(data);
}

export async function getTickers(signal?: AbortSignal): Promise<TradingPairWithStats[]> {
  const data = await apiFetch('/tickers', { signal });
  return TradingPairWithStatsListSchema.parse(data);
}
