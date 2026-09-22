import type { Organisation } from './organisation';
import type { User } from './user';
import type { Product, ProductVariant } from './product';

/**
 * Represents a single line item in a draft order.
 */
export interface DraftOrderItem {
  id: string;
  draftOrderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productSku: string;
  variantWeight?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  product?: Product | null;
  variant?: ProductVariant | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a Draft Order entity (retailer-scoped).
 */
export interface DraftOrder {
  id: string;
  organisationId: string;
  createdByUserId: string;
  title?: string | null;
  notes?: string | null;
  deliveryAddress?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  organisation?: Organisation | null;
  createdBy?: User | null;
  items?: DraftOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Line item input when creating or adding to a draft order.
 */
export interface CreateDraftOrderItemDto {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/**
 * Payload for creating a new draft order.
 */
export interface CreateDraftOrderDto {
  title?: string;
  items?: CreateDraftOrderItemDto[];
  notes?: string;
  deliveryAddress?: string;
}

/**
 * Payload for updating a draft order.
 */
export interface UpdateDraftOrderDto {
  title?: string | null;
  notes?: string | null;
  deliveryAddress?: string | null;
  items?: CreateDraftOrderItemDto[];
}

/**
 * Payload for adding an item to a draft order.
 */
export interface AddDraftOrderItemDto {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/**
 * Payload for updating an item in a draft order.
 */
export interface UpdateDraftOrderItemDto {
  quantity?: number;
  variantId?: string | null;
}

/**
 * Payload for bulk removing items from a draft order.
 */
export interface BulkRemoveDraftOrderItemsDto {
  itemIds: string[];
}

/**
 * Query parameters for filtering draft orders.
 */
export interface DraftOrderFilterParams {
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

