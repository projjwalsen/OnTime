import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  weight: z.string().trim().optional(),
  description: z.string().trim().optional(),
  image: z.string().trim().optional(),
  price: z.number({ message: 'Variant price is required' }).positive('Price must be greater than 0'),
});

export const createProductSchema = z.object({
  name: z.string({ message: 'Product name is required' }).min(2).trim(),
  sku: z.string({ message: 'SKU is required' }).min(1).trim(),
  description: z.string().optional(),
  price: z.number({ message: 'Price is required' }).positive('Price must be greater than 0'),
  categoryId: z.string().optional(),
  unit: z.string().default('piece'),
  isActive: z.boolean().default(true),
  variants: z.array(productVariantSchema).optional(),
  variant: productVariantSchema.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

