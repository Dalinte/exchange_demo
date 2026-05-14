import { TradeViewListSchema, type TradeView } from '@exchange/shared';
import { apiFetch } from './client';

type GetTradesParams = {
  symbol?: string;
  limit?: number;
};

export async function getTrades(
  params: GetTradesParams = {},
  signal?: AbortSignal,
): Promise<TradeView[]> {
  const data = await apiFetch('/trades', {
    query: { ...params },
    signal,
  });
  return TradeViewListSchema.parse(data);
}
