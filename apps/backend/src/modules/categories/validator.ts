import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ message: 'Category name is required' })
    .min(2, 'Category name must be at least 2 characters')
    .trim(),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryFilterQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryFilterInput = z.infer<typeof categoryFilterQuerySchema>;
