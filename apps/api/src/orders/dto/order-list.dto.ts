import { OrderViewListSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class OrderListDto extends createZodDto(OrderViewListSchema) {}
