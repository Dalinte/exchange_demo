import { Injectable } from '@nestjs/common';
import type { AccountSummary } from '@exchange/shared';
import { AccountType, type Account } from '../../generated/prisma/client';
import { STARTING_USDT } from '../auth/cookie';
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

  async reset(currentUserId: string): Promise<AccountSummary> {
    const account = await this.prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { id: currentUserId } });
      const user = await tx.user.create({ data: {} });
      const created = await tx.account.create({
        data: { userId: user.id, type: AccountType.SPOT },
      });
      await tx.balance.create({
        data: {
          accountId: created.id,
          asset: 'USDT',
          free: STARTING_USDT,
        },
      });
      return created;
    });
    return this.getSummary(account);
  }
}
