import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TradingPairListDto } from './dto/trading-pair-list.dto';
import { TradingPairWithStatsListDto } from './dto/trading-pair-with-stats-list.dto';
import { TradingPairsService } from './trading-pairs.service';

@ApiTags('trading-pairs')
@Controller()
export class TradingPairsController {
  constructor(private readonly tradingPairs: TradingPairsService) {}

  @Get('trading-pairs')
  @ApiOperation({
    summary: 'List active trading pairs',
    description:
      'Возвращает все активные торговые пары, упорядоченные по symbol.',
  })
  @ApiOkResponse({ type: TradingPairListDto })
  async list(): Promise<TradingPairListDto> {
    return this.tradingPairs.findActive();
  }

  @Get('tickers')
  @ApiOperation({
    summary: 'List active trading pairs with 24h ticker stats',
    description:
      'Возвращает активные пары вместе с lastPrice и 24-часовой статистикой ' +
      'из Binance ticker24h. Пары без свежего тикера пропускаются.',
  })
  @ApiOkResponse({ type: TradingPairWithStatsListDto })
  async tickers(): Promise<TradingPairWithStatsListDto> {
    return this.tradingPairs.findActiveWithStats();
  }
}
