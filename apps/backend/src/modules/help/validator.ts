import { z } from 'zod';
import { SupportTopic } from '@ontime/shared';

export const helpFilterQuerySchema = z.object({
  category: z.nativeEnum(SupportTopic).optional(),
  search: z.string().trim().optional(),
});

export type HelpFilterQueryInput = z.infer<typeof helpFilterQuerySchema>;
