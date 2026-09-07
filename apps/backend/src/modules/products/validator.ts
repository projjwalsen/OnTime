import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string({ message: 'Product name is required' }).min(2).trim(),
  sku: z.string({ message: 'SKU is required' }).min(1).trim(),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  categoryId: z.string().optional(),
  unit: z.string().default('piece'),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
