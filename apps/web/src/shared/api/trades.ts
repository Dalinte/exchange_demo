import { TradeListSchema, type TradeList } from '@exchange/shared';
import { apiFetch } from './client';

type GetTradesParams = {
  symbol?: string;
  limit?: number;
};

export async function getTrades(params: GetTradesParams = {}, signal?: AbortSignal): Promise<TradeList> {
  const data = await apiFetch('/trades', {
    query: { ...params },
    signal,
  });
  return TradeListSchema.parse(data);
}
