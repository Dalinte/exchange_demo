import { TradeViewListSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class TradeListDto extends createZodDto(TradeViewListSchema) {}
