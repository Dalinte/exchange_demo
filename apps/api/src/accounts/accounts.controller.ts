import { Controller, HttpCode, Post, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ACCOUNT_COOKIE_NAME, accountCookieOptions } from '../auth/cookie';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { AccountsService } from './accounts.service';

@ApiTags('account')
@ApiCookieAuth('account_id')
@Controller('account')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post('reset')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Reset the current account',
    description:
      'Удаляет текущего анонимного пользователя со всей историей (ордера, сделки, балансы) ' +
      'и создаёт нового с балансом 10000 USDT. Cookie `account_id` обновляется на новый UUID. ' +
      'Тело ответа пустое — получить новые балансы можно через `GET /api/balances`.',
  })
  @ApiNoContentResponse()
  async reset(
    @CurrentUser() user: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { userId } = await this.accounts.reset(user.id);
    res.cookie(ACCOUNT_COOKIE_NAME, userId, accountCookieOptions());
  }
}
