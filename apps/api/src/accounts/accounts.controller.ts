import { Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ACCOUNT_COOKIE_NAME, accountCookieOptions } from '../auth/cookie';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { AccountSummaryDto } from './dto/account-summary.dto';
import { AccountsService } from './accounts.service';

@ApiTags('account')
@ApiCookieAuth('account_id')
@Controller('account')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the current account with balances',
    description:
      'Возвращает SPOT-аккаунт, привязанный к cookie `account_id`. ' +
      'Если cookie отсутствует, middleware создаёт анонимный аккаунт ' +
      'с балансом 10000 USDT. Балансы упорядочены: USDT первым, остальные по убыванию `free`.',
  })
  @ApiOkResponse({ type: AccountSummaryDto })
  async me(@CurrentUser() user: CurrentUserType): Promise<AccountSummaryDto> {
    return this.accounts.getSummary(user.account);
  }

  @Post('reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Reset the current account',
    description:
      'Удаляет текущего анонимного пользователя со всей историей (ордера, сделки, балансы) ' +
      'и создаёт нового с балансом 10000 USDT. Cookie `account_id` обновляется на новый UUID.',
  })
  @ApiOkResponse({ type: AccountSummaryDto })
  async reset(
    @CurrentUser() user: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountSummaryDto> {
    const summary = await this.accounts.reset(user.id);
    res.cookie(ACCOUNT_COOKIE_NAME, summary.userId, accountCookieOptions());
    return summary;
  }
}
