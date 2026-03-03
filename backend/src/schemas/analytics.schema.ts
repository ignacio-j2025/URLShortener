import { z } from 'zod';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const analyticsQuerySchema = z.object({
  from: z
    .string()
    .regex(ISO_DATE_RE, 'from must be YYYY-MM-DD format')
    .optional(),
  to: z
    .string()
    .regex(ISO_DATE_RE, 'to must be YYYY-MM-DD format')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
