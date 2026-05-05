import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  AccountType,
  Prisma,
  type Account,
  type User,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const COOKIE_NAME = 'account_id';
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const STARTING_USDT = new Prisma.Decimal(10000);

type UserWithAccount = User & { account: Account };

@Injectable()
export class AnonymousUserMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = this.readUserIdCookie(req);

    let user: UserWithAccount | null = userId
      ? await this.findUserWithAccount(userId)
      : null;

    if (!user) {
      user = await this.createAnonymousUser();
      res.cookie(COOKIE_NAME, user.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE_MS,
      });
    }

    req.user = user;
    next();
  }

  private readUserIdCookie(req: Request): string | undefined {
    const raw: unknown = req.cookies?.[COOKIE_NAME];
    return typeof raw === 'string' ? raw : undefined;
  }

  private async findUserWithAccount(
    userId: string,
  ): Promise<UserWithAccount | null> {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: { where: { type: AccountType.SPOT }, take: 1 } },
    });
    if (!found || !found.accounts[0]) return null;
    const { accounts, ...rest } = found;
    return { ...rest, account: accounts[0] };
  }

  private async createAnonymousUser(): Promise<UserWithAccount> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: {} });
      const account = await tx.account.create({
        data: { userId: created.id, type: AccountType.SPOT },
      });
      await tx.balance.create({
        data: { accountId: account.id, asset: 'USDT', free: STARTING_USDT },
      });
      return { ...created, account };
    });
  }
}
