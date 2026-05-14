import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { BalanceMapDto } from './dto/balance-map.dto';
import { BalancesService } from './balances.service';

@ApiTags('balances')
@ApiCookieAuth('account_id')
@Controller('balances')
export class BalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get balances for the current account',
    description:
      'Возвращает балансы текущего анонимного аккаунта как map `{ [asset]: BalanceItem }`. ' +
      'Каждый item содержит `free`, `locked`, `total = free + locked` и `valueUsdt` ' +
      '(оценка в USDT по текущей цене Binance). USDT идёт первым, остальные — по убыванию `free`.',
  })
  @ApiOkResponse({ type: BalanceMapDto })
  async list(@CurrentUser() user: CurrentUserType): Promise<BalanceMapDto> {
    return this.balances.findForAccount(user.account.id);
  }
}
