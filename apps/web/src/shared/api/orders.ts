import {
  CreateOrderSchema,
  OrderListSchema,
  OrderSchema,
  type CreateOrderDto,
  type Order,
  type OrderList,
} from '@exchange/shared';
import { apiFetch } from './client';

type GetOrdersParams = {
  status?: string;
  symbol?: string;
  limit?: number;
};

export async function getOrders(params: GetOrdersParams = {}, signal?: AbortSignal): Promise<OrderList> {
  const data = await apiFetch('/orders', {
    query: { ...params },
    signal,
  });
  return OrderListSchema.parse(data);
}

export async function createOrder(dto: CreateOrderDto): Promise<Order> {
  const body = CreateOrderSchema.parse(dto);
  const data = await apiFetch('/orders', { method: 'POST', body });
  return OrderSchema.parse(data);
}

export async function cancelOrder(id: string): Promise<Order> {
  const data = await apiFetch(`/orders/${id}`, { method: 'DELETE' });
  return OrderSchema.parse(data);
}
