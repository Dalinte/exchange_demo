import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { GetTradesQueryDto } from '../common/dto/get-trades-query.dto';
import { TradeListDto } from '../common/dto/trade-list.dto';
import { TradesService } from './trades.service';

@ApiTags('trades')
@ApiCookieAuth('account_id')
@Controller('trades')
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Get()
  @ApiOperation({
    summary: 'List trades for the current account',
    description:
      'История сделок текущего пользователя, отсортированная по `createdAt desc`. ' +
      'Опциональные фильтры: `symbol` и `limit` (1..200, default 50).',
  })
  @ApiOkResponse({ type: TradeListDto })
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: GetTradesQueryDto,
  ): Promise<TradeListDto> {
    return this.trades.findForAccount(user.account.id, query);
  }
}
