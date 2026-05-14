import { Injectable } from '@nestjs/common';
import type { BalanceMap } from '@exchange/shared';
import { BalanceMapper } from './balance.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceMapper: BalanceMapper,
  ) {}

  async findForAccount(accountId: string): Promise<BalanceMap> {
    const balances = await this.prisma.balance.findMany({
      where: { accountId },
    });

    balances.sort((a, b) => {
      if (a.asset === 'USDT' && b.asset !== 'USDT') return -1;
      if (b.asset === 'USDT' && a.asset !== 'USDT') return 1;
      return b.free.cmp(a.free);
    });

    return this.balanceMapper.toViewMap(balances);
  }
}
