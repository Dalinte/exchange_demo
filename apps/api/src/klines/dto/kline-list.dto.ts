import { KlineListSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class KlineListDto extends createZodDto(KlineListSchema) {}
