import { Injectable } from '@nestjs/common';
import type { GetTradesQuery, TradeList } from '@exchange/shared';
import { serializeDecimal } from '../common/serialize-decimal';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async findForAccount(
    accountId: string,
    query: GetTradesQuery,
  ): Promise<TradeList> {
    let tradingPairId: string | undefined;
    if (query.symbol) {
      const pair = await this.prisma.tradingPair.findUnique({
        where: { symbol: query.symbol },
        select: { id: true },
      });
      if (!pair) return [];
      tradingPairId = pair.id;
    }

    const trades = await this.prisma.trade.findMany({
      where: { accountId, ...(tradingPairId ? { tradingPairId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return serializeDecimal(trades) as TradeList;
  }
}
