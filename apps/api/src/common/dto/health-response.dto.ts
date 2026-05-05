import { HealthResponseSchema } from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
