import { z } from 'zod';

export const updateTaxSettingsSchema = z.object({
  taxName: z
    .string()
    .trim()
    .min(1, 'Tax name or label is required')
    .max(50, 'Tax name cannot exceed 50 characters')
    .optional(),
  taxRate: z
    .number()
    .min(0, 'Tax rate percentage cannot be negative')
    .max(100, 'Tax rate percentage cannot exceed 100%')
    .optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateTaxSettingsInput = z.infer<typeof updateTaxSettingsSchema>;

