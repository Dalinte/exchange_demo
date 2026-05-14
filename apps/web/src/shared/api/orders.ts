import {
  CreateOrderSchema,
  OrderViewListSchema,
  OrderViewSchema,
  type CreateOrderDto,
  type OrderView,
} from '@exchange/shared';
import { apiFetch } from './client';

type GetOrdersParams = {
  status?: string;
  symbol?: string;
  limit?: number;
};

export async function getOrders(
  params: GetOrdersParams = {},
  signal?: AbortSignal,
): Promise<OrderView[]> {
  const data = await apiFetch('/orders', {
    query: { ...params },
    signal,
  });
  return OrderViewListSchema.parse(data);
}

export async function createOrder(dto: CreateOrderDto): Promise<OrderView> {
  const body = CreateOrderSchema.parse(dto);
  const data = await apiFetch('/orders', { method: 'POST', body });
  return OrderViewSchema.parse(data);
}

export async function cancelOrder(id: string): Promise<OrderView> {
  const data = await apiFetch(`/orders/${id}`, { method: 'DELETE' });
  return OrderViewSchema.parse(data);
}
