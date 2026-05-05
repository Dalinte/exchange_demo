import { AccountSummarySchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class AccountSummaryDto extends createZodDto(AccountSummarySchema) {}
