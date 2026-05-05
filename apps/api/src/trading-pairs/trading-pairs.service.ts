import { Injectable } from '@nestjs/common';
import type { TradingPairList } from '@exchange/shared';
import { serializeDecimal } from '../common/serialize-decimal';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradingPairsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<TradingPairList> {
    const pairs = await this.prisma.tradingPair.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
      select: {
        id: true,
        symbol: true,
        baseAsset: true,
        quoteAsset: true,
        pricePrecision: true,
        quantityPrecision: true,
        minQuantity: true,
        isActive: true,
      },
    });
    return serializeDecimal(pairs) as TradingPairList;
  }
}
