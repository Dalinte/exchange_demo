import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
}
