import { z } from 'zod';
import { OrderStatus } from '@ontime/shared';

export const createOrderItemSchema = z.object({
  productId: z.string({ message: 'Product ID is required' }).min(1, 'Product ID is required'),
  variantId: z.string().nullable().optional(),
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  items: z
    .array(createOrderItemSchema, { message: 'Items array is required' })
    .min(1, 'Order must contain at least one item'),
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
  organisationId: z.string().nullable().optional(),
});

export const modifyOrderItemSchema = z.object({
  productId: z.string({ message: 'Product ID is required' }).min(1, 'Product ID is required'),
  variantId: z.string().nullable().optional(),
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity must be 0 or more'),
});

export const modifyOrderSchema = z.object({
  items: z
    .array(modifyOrderItemSchema, { message: 'Items array is required' })
    .min(1, 'Order must contain at least one item'),
  modificationNote: z.string().trim().optional(),
  status: z.enum([OrderStatus.AWAITING, OrderStatus.CONFIRMED]).optional(),
});

export const approvePartialOrderSchema = z.object({
  notes: z.string().trim().optional(),
  approvalNote: z.string().trim().optional(),
});

export const rejectPartialOrderSchema = z.object({
  reason: z.string().trim().optional(),
  rejectionReason: z.string().trim().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      OrderStatus.AWAITING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.DISPATCHED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REJECTED,
    ],
    { message: 'Invalid order status transition' },
  ),
  cancellationReason: z.string().trim().optional(),
  modificationNote: z.string().trim().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().optional(),
  cancellationReason: z.string().trim().optional(),
});

const ALL_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.AWAITING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
] as const;

const orderStatusEnum = z.enum(ALL_ORDER_STATUSES, {
  message: `Invalid order status. Allowed values: ${ALL_ORDER_STATUSES.join(', ')}`,
});

function normalizeStatusParam(val: unknown): unknown {
  if (val === undefined || val === null || val === '') {
    return undefined;
  }
  if (Array.isArray(val)) {
    const flattened = val
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
      .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : item))
      .filter((item) => item !== '' && item !== undefined && item !== null);
    return flattened.length > 0 ? flattened : undefined;
  }
  if (typeof val === 'string') {
    const parts = val
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item !== '');
    return parts.length > 0 ? parts : undefined;
  }
  return val;
}

const statusParamSchema = z
  .preprocess(normalizeStatusParam, z.array(orderStatusEnum).optional())
  .optional();

export const orderFilterQuerySchema = z
  .object({
    status: statusParamSchema,
    statuses: statusParamSchema,
    'status[]': statusParamSchema,
    'statuses[]': statusParamSchema,
    organisationId: z.string().optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .transform((data) => {
    const collected: OrderStatus[] = [
      ...(data.status || []),
      ...(data.statuses || []),
      ...(data['status[]'] || []),
      ...(data['statuses[]'] || []),
    ];

    const uniqueStatuses = Array.from(new Set(collected));

    return {
      status: uniqueStatuses.length > 0 ? uniqueStatuses : undefined,
      organisationId: data.organisationId,
      search: data.search,
      page: data.page,
      limit: data.limit,
      startDate: data.startDate,
      endDate: data.endDate,
    };
  });

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ModifyOrderItemInput = z.infer<typeof modifyOrderItemSchema>;
export type ModifyOrderInput = z.infer<typeof modifyOrderSchema>;
export type ApprovePartialOrderInput = z.infer<typeof approvePartialOrderSchema>;
export type RejectPartialOrderInput = z.infer<typeof rejectPartialOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterQuerySchema>;


