import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { AccountSummaryDto } from '../common/dto/account-summary.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('account')
@ApiCookieAuth('account_id')
@Controller('account')
export class AccountController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the current account with balances',
    description:
      'Returns the SPOT account associated with the `account_id` cookie. ' +
      'If no cookie is present, the middleware creates a fresh anonymous account ' +
      'with 10000 USDT and sets the cookie on the response.',
  })
  @ApiOkResponse({ type: AccountSummaryDto })
  async me(@CurrentUser() user: CurrentUserType): Promise<AccountSummaryDto> {
    const account = user.account;
    const balances = await this.prisma.balance.findMany({
      where: { accountId: account.id },
      orderBy: { asset: 'asc' },
    });

    return {
      id: account.id,
      userId: account.userId,
      type: account.type,
      createdAt: account.createdAt.toISOString(),
      balances: balances.map((b) => ({
        id: b.id,
        accountId: b.accountId,
        asset: b.asset,
        free: b.free.toString(),
        locked: b.locked.toString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    };
  }
}
