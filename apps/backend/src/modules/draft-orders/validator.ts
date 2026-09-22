import { z } from 'zod';

export const createDraftOrderItemSchema = z.object({
  productId: z.string({ message: 'Product ID is required' }).min(1, 'Product ID is required'),
  variantId: z.string().nullable().optional(),
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .default(1),
});

export const createDraftOrderSchema = z.object({
  title: z.string().trim().nullable().optional(),
  items: z.array(createDraftOrderItemSchema).optional().default([]),
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
});

export const updateDraftOrderSchema = z.object({
  title: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
  items: z.array(createDraftOrderItemSchema).optional(),
});

export const addDraftOrderItemSchema = z.object({
  productId: z.string({ message: 'Product ID is required' }).min(1, 'Product ID is required'),
  variantId: z.string().nullable().optional(),
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .default(1),
});

export const updateDraftOrderItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .optional(),
  variantId: z.string().nullable().optional(),
});

export const bulkRemoveDraftOrderItemsSchema = z.object({
  itemIds: z
    .array(z.string().min(1, 'Item ID cannot be empty'), {
      message: 'itemIds array is required',
    })
    .min(1, 'At least one item ID must be provided'),
});

export const convertDraftOrderSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
});

export const draftOrderFilterQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateDraftOrderItemInput = z.infer<typeof createDraftOrderItemSchema>;
export type CreateDraftOrderInput = z.infer<typeof createDraftOrderSchema>;
export type UpdateDraftOrderInput = z.infer<typeof updateDraftOrderSchema>;
export type AddDraftOrderItemInput = z.infer<typeof addDraftOrderItemSchema>;
export type UpdateDraftOrderItemInput = z.infer<typeof updateDraftOrderItemSchema>;
export type BulkRemoveDraftOrderItemsInput = z.infer<typeof bulkRemoveDraftOrderItemsSchema>;
export type ConvertDraftOrderInput = z.infer<typeof convertDraftOrderSchema>;
export type DraftOrderFilterInput = z.infer<typeof draftOrderFilterQuerySchema>;

