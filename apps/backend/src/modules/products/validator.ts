import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().optional(),
  weight: z.string().trim().optional(),
  description: z.string().trim().optional(),
  image: z.string().trim().optional(),
  price: z
    .number({ message: 'Variant price is required' })
    .positive('Price must be greater than 0'),
  tier1Price: z.number().positive().optional(),
  tier2Price: z.number().positive().optional(),
  tier3Price: z.number().positive().optional(),
});

export const createProductSchema = z.object({
  name: z.string({ message: 'Product name is required' }).min(2).trim(),
  sku: z.string({ message: 'SKU is required' }).min(1).trim(),
  description: z.string().optional(),
  price: z.number({ message: 'Price is required' }).positive('Price must be greater than 0'),
  tier1Price: z.number().positive().optional(),
  tier2Price: z.number().positive().optional(),
  tier3Price: z.number().positive().optional(),
  noVat: z.boolean().default(false),
  tags: z.array(z.string().trim()).default([]),
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
  q: z.string().trim().optional(),
  id: z.string().trim().optional(),
  name: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  packagingNote: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  price: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  tag: z.string().trim().optional(),
  noVat: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const productSearchQuerySchema = productFilterQuerySchema;

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterQuerySchema>;
export type ProductSearchInput = z.infer<typeof productSearchQuerySchema>;
