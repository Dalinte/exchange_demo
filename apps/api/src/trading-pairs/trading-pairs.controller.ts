import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TradingPairListDto } from './dto/trading-pair-list.dto';
import { TradingPairsService } from './trading-pairs.service';

@ApiTags('trading-pairs')
@Controller('trading-pairs')
export class TradingPairsController {
  constructor(private readonly tradingPairs: TradingPairsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active trading pairs',
    description: 'Возвращает все активные торговые пары, упорядоченные по symbol.',
  })
  @ApiOkResponse({ type: TradingPairListDto })
  async list(): Promise<TradingPairListDto> {
    return this.tradingPairs.findActive();
  }
}
