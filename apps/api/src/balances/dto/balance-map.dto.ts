import { BalanceMapSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class BalanceMapDto extends createZodDto(BalanceMapSchema) {}
