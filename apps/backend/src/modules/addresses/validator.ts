import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string({ message: 'Address label is required' }).min(1, 'Label cannot be empty').trim(),
  streetAddress: z.string({ message: 'Street address is required' }).min(2, 'Street address is required').trim(),
  city: z.string({ message: 'City is required' }).min(1, 'City is required').trim(),
  postalCode: z.string({ message: 'Postal code is required' }).min(1, 'Postal code is required').trim(),
  deliveryInstructions: z.string().trim().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = z.object({
  label: z.string().min(1).trim().optional(),
  streetAddress: z.string().min(2).trim().optional(),
  city: z.string().min(1).trim().optional(),
  postalCode: z.string().min(1).trim().optional(),
  deliveryInstructions: z.string().trim().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
