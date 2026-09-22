import { z } from 'zod';

export const updateNotificationPreferencesSchema = z.object({
  orderUpdates: z.boolean().optional(),
  draftReminders: z.boolean().optional(),
  marketingUpdates: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
