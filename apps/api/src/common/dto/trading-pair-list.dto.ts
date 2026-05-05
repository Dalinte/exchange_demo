import { TradingPairListSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class TradingPairListDto extends createZodDto(TradingPairListSchema) {}
