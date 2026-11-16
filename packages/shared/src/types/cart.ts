import type { Product, ProductVariant } from './product';
import type { Organisation } from './organisation';

/**
 * Line item in a cart with resolved pricing and tax details.
 */
export interface CartItem {
  id: string;
  cartId?: string | undefined;
  productId: string;
  variantId?: string | null | undefined;
  productName: string;
  productSku: string;
  description?: string | null | undefined;
  image?: string | null | undefined;
  unit: string;
  variantWeight?: string | null | undefined;
  basePrice: number;
  tierPrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  noVat: boolean;
  taxRate: number;
  taxAmount: number;
  product?: Product | null | undefined;
  variant?: ProductVariant | null | undefined;
  createdAt?: Date | string | undefined;
  updatedAt?: Date | string | undefined;
}

/**
 * Comprehensive financial summary of a cart / order preview.
 */
export interface CartSummary {
  itemCount: number;
  uniqueItemCount: number;
  subtotal: number;
  discountAmount: number;
  appliedCoupon: {
    code: string;
    discountType: string;
    discountValue: number;
    description?: string | null | undefined;
  } | null;
  taxableSubtotal: number;
  taxExemptSubtotal: number;
  taxRate: number;
  taxName: string;
  taxAmount: number;
  deliveryCharge: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold?: number | undefined;
  otherCharges: number;
  otherChargesNote?: string | null | undefined;
  totalAmount: number;
  currency: string;
  pricingTier: string;
  retailer?:
    | {
        id: string;
        name: string;
        pricingTier: string;
      }
    | null
    | undefined;
}

/**
 * Full cart structure with items, metadata, and financial summary.
 */
export interface Cart {
  id: string;
  organisationId: string;
  userId: string;
  couponCode?: string | null | undefined;
  notes?: string | null | undefined;
  deliveryAddress?: string | null | undefined;
  deliveryCharge?: number | undefined;
  otherCharges?: number | undefined;
  otherChargesNote?: string | null | undefined;
  items: CartItem[];
  summary: CartSummary;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Input for a single item in cart operations or preview.
 */
export interface CartItemInputDto {
  productId: string;
  variantId?: string | null | undefined;
  quantity: number;
}

/**
 * Payload for requesting an on-the-fly preview / calculation.
 */
export interface CartPreviewDto {
  items: CartItemInputDto[];
  couponCode?: string | null | undefined;
  deliveryAddress?: string | null | undefined;
  organisationId?: string | null | undefined;
  deliveryCharge?: number | null | undefined;
  otherCharges?: number | null | undefined;
  otherChargesNote?: string | null | undefined;
}

/**
 * Result returned by the preview endpoint.
 */
export interface CartPreviewResult {
  items: CartItem[];
  summary: CartSummary;
  warnings?: string[] | undefined;
}

/**
 * Payload for updating cart details (address, notes, extra charges).
 */
export interface UpdateCartDto {
  notes?: string | null | undefined;
  deliveryAddress?: string | null | undefined;
  deliveryCharge?: number | null | undefined;
  otherCharges?: number | null | undefined;
  otherChargesNote?: string | null | undefined;
}

/**
 * Payload for converting cart to a placed order.
 */
export interface CartCheckoutDto {
  deliveryAddress?: string | null | undefined;
  customerPoNumber?: string | null | undefined;
  notes?: string | null | undefined;
  deliveryCharge?: number | null | undefined;
  otherCharges?: number | null | undefined;
  otherChargesNote?: string | null | undefined;
}

/**
 * Payload for converting cart to a draft order.
 */
export interface CartSaveDraftDto {
  title?: string | null | undefined;
  deliveryAddress?: string | null | undefined;
  customerPoNumber?: string | null | undefined;
  notes?: string | null | undefined;
  deliveryCharge?: number | null | undefined;
  otherCharges?: number | null | undefined;
  otherChargesNote?: string | null | undefined;
}
