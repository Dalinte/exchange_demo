import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BinancePriceService } from '../binance/binance-price.service';
import { GetKlinesQueryDto } from './dto/get-klines-query.dto';
import { KlineListDto } from './dto/kline-list.dto';

@ApiTags('klines')
@Controller('klines')
export class KlinesController {
  constructor(private readonly binancePrice: BinancePriceService) {}

  @Get()
  @ApiOperation({
    summary: 'Get candlestick data for a symbol',
    description:
      'Проксирует Binance /api/v3/klines. Возвращает массив свечей в порядке возрастания openTime. ' +
      'Без кэширования — последняя свеча всегда свежая.',
  })
  @ApiOkResponse({ type: KlineListDto })
  async list(@Query() query: GetKlinesQueryDto): Promise<KlineListDto> {
    return this.binancePrice.getKlines(
      query.symbol,
      query.interval,
      query.limit,
    );
  }
}
