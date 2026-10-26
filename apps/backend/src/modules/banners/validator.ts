import { z } from 'zod';

export const createBannerSchema = z.object({
  title: z
    .string({ message: 'Banner title is required' })
    .min(1, 'Title cannot be empty')
    .max(150, 'Title cannot exceed 150 characters')
    .trim(),
  subtitle: z.string().max(300).optional().nullable(),
  imageUrl: z
    .string({ message: 'Banner image is required' })
    .min(1, 'Image URL cannot be empty')
    .trim(),
  linkUrl: z.string().trim().optional().nullable(),
  displayOrder: z.number().int().default(0).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateBannerSchema = z.object({
  title: z.string().min(1).max(150).trim().optional(),
  subtitle: z.string().max(300).optional().nullable(),
  imageUrl: z.string().min(1).trim().optional(),
  linkUrl: z.string().trim().optional().nullable(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

