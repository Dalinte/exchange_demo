import { Injectable } from '@nestjs/common';
import type { AccountSummary } from '@exchange/shared';
import type { Account } from '../../generated/prisma/client';
import { serializeDecimal } from '../common/serialize-decimal';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(account: Account): Promise<AccountSummary> {
    const balances = await this.prisma.balance.findMany({
      where: { accountId: account.id },
    });

    balances.sort((a, b) => {
      if (a.asset === 'USDT' && b.asset !== 'USDT') return -1;
      if (b.asset === 'USDT' && a.asset !== 'USDT') return 1;
      return b.free.cmp(a.free);
    });

    const summary = {
      id: account.id,
      userId: account.userId,
      type: account.type,
      createdAt: account.createdAt,
      balances,
    };

    return serializeDecimal(summary) as AccountSummary;
  }
}
