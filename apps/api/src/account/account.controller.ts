import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('account')
export class AccountController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: CurrentUserType) {
    const balances = await this.prisma.balance.findMany({
      where: { accountId: user.account.id },
      orderBy: { asset: 'asc' },
    });
    return {
      id: user.id,
      createdAt: user.createdAt,
      account: { ...user.account, balances },
    };
  }
}
