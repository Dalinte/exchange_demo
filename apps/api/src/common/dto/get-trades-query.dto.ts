import { GetTradesQuerySchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class GetTradesQueryDto extends createZodDto(GetTradesQuerySchema) {}
