import { z } from 'zod';
import { SupportTopic } from '@ontime/shared';

export const createSupportTicketSchema = z.object({
  topic: z.nativeEnum(SupportTopic, { message: 'Valid support topic is required' }),
  orderNumber: z.string().trim().optional().nullable(),
  subject: z.string({ message: 'Subject is required' }).min(2, 'Subject must be at least 2 characters').trim(),
  message: z.string({ message: 'Message is required' }).min(5, 'Message must be at least 5 characters').trim(),
  attachments: z.array(z.string().url()).optional().default([]),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
