import { TradingPairWithStatsListSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class TradingPairWithStatsListDto extends createZodDto(
  TradingPairWithStatsListSchema,
) {}
