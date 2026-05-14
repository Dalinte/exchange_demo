import { OrderViewSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class OrderDto extends createZodDto(OrderViewSchema) {}
