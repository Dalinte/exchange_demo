import { Injectable, Logger } from '@nestjs/common';
import type { TradingPair, TradingPairWithStats } from '@exchange/shared';
import { BinancePriceService } from '../binance/binance-price.service';
import { TradingPairMapper } from './trading-pair.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradingPairsService {
  private readonly logger = new Logger(TradingPairsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: TradingPairMapper,
    private readonly binancePrice: BinancePriceService,
  ) {}

  async findActive(): Promise<TradingPair[]> {
    const pairs = await this.prisma.tradingPair.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
    });
    return pairs.map((pair) => this.mapper.toView(pair));
  }

  async findActiveWithStats(): Promise<TradingPairWithStats[]> {
    const pairs = await this.prisma.tradingPair.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
    });
    const tickers = await this.binancePrice.getAllTickers24h();
    const result: TradingPairWithStats[] = [];
    for (const pair of pairs) {
      const ticker = tickers.get(pair.symbol);
      if (!ticker) {
        this.logger.warn(`No 24h ticker data for ${pair.symbol}, skipping`);
        continue;
      }
      result.push(this.mapper.toViewWithStats(pair, ticker));
    }
    return result;
  }
}
