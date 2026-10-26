import { z } from 'zod';
import { DiscountType } from '@ontime/shared';

export const createCouponSchema = z.object({
  code: z
    .string({ message: 'Coupon code is required' })
    .min(3, 'Code must be at least 3 characters')
    .max(30, 'Code cannot exceed 30 characters')
    .trim()
    .transform((val) => val.toUpperCase()),
  description: z.string().optional(),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.PERCENTAGE),
  discountValue: z
    .number({ message: 'Discount value is required' })
    .positive('Discount value must be greater than zero'),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  usageLimit: z.number().int().positive().default(1).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true).optional(),
  organisationId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  sendEmailToCustomer: z.boolean().default(true).optional(),
});

export const updateCouponSchema = z.object({
  description: z.string().optional().nullable(),
  discountType: z.nativeEnum(DiscountType).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  organisationId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
});

export const validateCouponSchema = z.object({
  code: z
    .string({ message: 'Coupon code is required' })
    .trim()
    .transform((val) => val.toUpperCase()),
  orderAmount: z.number({ message: 'Order amount is required' }).positive('Order amount must be positive'),
});

