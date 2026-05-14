import { Injectable } from '@nestjs/common';
import { AccountType } from '../../generated/prisma/client';
import { STARTING_USDT } from '../auth/cookie';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async reset(currentUserId: string): Promise<{ userId: string }> {
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { id: currentUserId } });
      const user = await tx.user.create({ data: {} });
      const account = await tx.account.create({
        data: { userId: user.id, type: AccountType.SPOT },
      });
      await tx.balance.create({
        data: {
          accountId: account.id,
          asset: 'USDT',
          free: STARTING_USDT,
        },
      });
      return user;
    });

    return { userId: user.id };
  }
}
