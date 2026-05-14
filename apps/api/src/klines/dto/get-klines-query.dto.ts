import { GetKlinesQuerySchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class GetKlinesQueryDto extends createZodDto(GetKlinesQuerySchema) {}
