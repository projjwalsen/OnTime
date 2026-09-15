import { z } from 'zod';
import { OrderStatus } from '@ontime/shared';

export const createOrderItemSchema = z.object({
  productId: z.string({ message: 'Product ID is required' }).min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  items: z
    .array(createOrderItemSchema, { message: 'Items array is required' })
    .min(1, 'Order must contain at least one item'),
  notes: z.string().trim().optional(),
  deliveryAddress: z.string().trim().optional(),
  organisationId: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.DISPATCHED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ],
    { message: 'Invalid order status transition' },
  ),
  cancellationReason: z.string().trim().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().optional(),
  cancellationReason: z.string().trim().optional(),
});

export const orderFilterQuerySchema = z.object({
  status: z
    .enum([
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.DISPATCHED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ])
    .optional(),
  organisationId: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterQuerySchema>;
