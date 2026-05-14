import { Injectable } from '@nestjs/common';
import type { GetTradesQuery, TradeView } from '@exchange/shared';
import { TradeMapper } from './trade.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tradeMapper: TradeMapper,
  ) {}

  async findForAccount(
    accountId: string,
    query: GetTradesQuery,
  ): Promise<TradeView[]> {
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
      include: { tradingPair: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return this.tradeMapper.toViewList(trades);
  }
}
