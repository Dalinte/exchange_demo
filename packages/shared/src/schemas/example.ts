import { z } from 'zod';

export const HealthCheckStatusSchema = z.enum(['connected', 'disconnected']);

export const HealthResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    timestamp: z.number().int().positive(),
    checks: z.object({
      db: HealthCheckStatusSchema,
      binance: HealthCheckStatusSchema,
    }),
  })
  .meta({ id: 'HealthResponse' });

export type HealthCheckStatus = z.infer<typeof HealthCheckStatusSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
