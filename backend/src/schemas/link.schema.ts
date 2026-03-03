import { z } from 'zod';

export const createLinkSchema = z.object({
  targetUrl: z
    .string()
    .min(1, 'Target URL is required')
    .url('Must be a valid URL (include https://)'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
