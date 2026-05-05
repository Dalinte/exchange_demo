import { Injectable } from '@nestjs/common';
import type { GetOrdersQuery, OrderList } from '@exchange/shared';
import { serializeDecimal } from '../common/serialize-decimal';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findForAccount(
    accountId: string,
    query: GetOrdersQuery,
  ): Promise<OrderList> {
    let tradingPairId: string | undefined;
    if (query.symbol) {
      const pair = await this.prisma.tradingPair.findUnique({
        where: { symbol: query.symbol },
        select: { id: true },
      });
      if (!pair) return [];
      tradingPairId = pair.id;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        accountId,
        ...(tradingPairId ? { tradingPairId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return serializeDecimal(orders) as OrderList;
  }
}
