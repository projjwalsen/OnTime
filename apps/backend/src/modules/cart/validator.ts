import { z } from 'zod';

export const cartItemInputSchema = z.object({
  productId: z
    .string({ message: 'Product ID is required' })
    .min(1, 'Product ID is required')
    .trim(),
  variantId: z.string().trim().nullable().optional(),
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .default(1),
});

export const cartPreviewSchema = z.object({
  items: z
    .array(cartItemInputSchema, { message: 'Items array is required' })
    .min(1, 'At least one item is required for calculation and preview'),
  couponCode: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
  organisationId: z.string().trim().nullable().optional(),
  deliveryCharge: z.number().min(0, 'Delivery charge must be 0 or more').nullable().optional(),
  otherCharges: z.number().min(0, 'Other charges must be 0 or more').nullable().optional(),
  otherChargesNote: z.string().trim().nullable().optional(),
});

export const addCartItemSchema = cartItemInputSchema;

export const updateCartItemSchema = z.object({
  quantity: z
    .number({ message: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1'),
  variantId: z.string().trim().nullable().optional(),
});

export const updateCartSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
  deliveryCharge: z.number().min(0).nullable().optional(),
  otherCharges: z.number().min(0).nullable().optional(),
  otherChargesNote: z.string().trim().nullable().optional(),
});

export const applyCouponSchema = z.object({
  couponCode: z
    .string({ message: 'Coupon code is required' })
    .min(1, 'Coupon code cannot be empty')
    .trim(),
});

export const cartCheckoutSchema = z.object({
  customerPoNumber: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
  deliveryCharge: z.number().min(0).nullable().optional(),
  otherCharges: z.number().min(0).nullable().optional(),
  otherChargesNote: z.string().trim().nullable().optional(),
});

export const cartSaveDraftSchema = z.object({
  title: z.string().trim().nullable().optional(),
  customerPoNumber: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  deliveryAddress: z.string().trim().nullable().optional(),
  deliveryCharge: z.number().min(0).nullable().optional(),
  otherCharges: z.number().min(0).nullable().optional(),
  otherChargesNote: z.string().trim().nullable().optional(),
});

export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CartPreviewInput = z.infer<typeof cartPreviewSchema>;
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CartCheckoutInput = z.infer<typeof cartCheckoutSchema>;
export type CartSaveDraftInput = z.infer<typeof cartSaveDraftSchema>;
