import { GetOrdersQuerySchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class GetOrdersQueryDto extends createZodDto(GetOrdersQuerySchema) {}
