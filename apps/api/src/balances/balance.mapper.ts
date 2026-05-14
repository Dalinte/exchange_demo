import { Injectable, Logger } from '@nestjs/common';
import type { BalanceItem, BalanceMap } from '@exchange/shared';
import Decimal from 'decimal.js';
import type { Balance as PrismaBalance } from '../../generated/prisma/client';
import { BinancePriceService } from '../binance/binance-price.service';

const USDT = 'USDT';

@Injectable()
export class BalanceMapper {
  private readonly logger = new Logger(BalanceMapper.name);

  constructor(private readonly priceService: BinancePriceService) {}

  async toViewMap(balances: PrismaBalance[]): Promise<BalanceMap> {
    const map: BalanceMap = {};
    for (const balance of balances) {
      map[balance.asset] = await this.toItem(balance);
    }
    return map;
  }

  private async toItem(balance: PrismaBalance): Promise<BalanceItem> {
    const free = new Decimal(balance.free.toString());
    const locked = new Decimal(balance.locked.toString());
    const total = free.plus(locked);
    const valueUsdt = await this.valueInUsdt(balance.asset, total);

    return {
      asset: balance.asset,
      free: free.toFixed(),
      locked: locked.toFixed(),
      total: total.toFixed(),
      valueUsdt: valueUsdt.toFixed(),
    };
  }

  private async valueInUsdt(asset: string, total: Decimal): Promise<Decimal> {
    if (asset === USDT) return total;
    if (total.isZero()) return new Decimal(0);
    try {
      const price = await this.priceService.getCurrentPrice(`${asset}${USDT}`);
      return total.mul(price);
    } catch (err) {
      this.logger.warn(
        `Failed to value ${asset} in USDT: ${(err as Error).message}`,
      );
      return new Decimal(0);
    }
  }
}
