import { z } from 'zod';
import { TimestampSchema } from '../common.js';

export const HealthCheckStatusSchema = z.enum(['connected', 'disconnected']);

export const HealthChecksSchema = z.object({
  database: HealthCheckStatusSchema,
  binance: HealthCheckStatusSchema,
});

export const HealthResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    timestamp: TimestampSchema,
    checks: HealthChecksSchema,
  })
  .meta({ id: 'HealthResponse' });

export type HealthCheckStatus = z.infer<typeof HealthCheckStatusSchema>;
export type HealthChecks = z.infer<typeof HealthChecksSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
