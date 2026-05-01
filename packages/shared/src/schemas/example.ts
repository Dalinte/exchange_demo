import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.number().int().positive(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
