import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  weight: z.string().trim().optional(),
  description: z.string().trim().optional(),
  image: z.string().trim().optional(),
  price: z
    .number({ message: 'Variant price is required' })
    .positive('Price must be greater than 0'),
});

export const createProductSchema = z.object({
  name: z.string({ message: 'Product name is required' }).min(2).trim(),
  sku: z.string({ message: 'SKU is required' }).min(1).trim(),
  description: z.string().optional(),
  price: z.number({ message: 'Price is required' }).positive('Price must be greater than 0'),
  categoryId: z.string().optional(),
  unit: z.string().default('piece'),
  isActive: z.boolean().default(true),
  images: z.array(z.string().trim()).default([]),
  packagingNote: z.string().trim().nullable().optional(),
  variants: z.array(productVariantSchema).optional(),
  variant: productVariantSchema.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productFilterQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterQuerySchema>;
