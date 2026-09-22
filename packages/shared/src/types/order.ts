import { OrderStatus } from '../enums/order-status';
import { UserRole } from '../enums/roles';
import type { Organisation } from './organisation';
import type { User } from './user';
import type { Product, ProductVariant } from './product';

/**
 * Represents a timestamped audit trail entry for an order lifecycle event.
 */
export interface OrderHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  action: string;
  note?: string | null;
  performedByUserId?: string | null;
  performedByUserName?: string | null;
  performedByUserRole?: UserRole | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}

/**
 * Represents a single item in an order with snapshot information.
 */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productSku: string;
  variantWeight?: string | null;
  unitPrice: number;
  quantity: number;
  originalQuantity?: number | null;
  totalPrice: number;
  product?: Product | null;
  variant?: ProductVariant | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents an Order entity.
 */
export interface Order {
  id: string;
  orderNumber: string;
  organisationId: string;
  createdByUserId: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  modificationNote?: string | null;
  modifiedAt?: Date | null;
  deliveryAddress?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  deliveredAt?: Date | null;
  organisation?: Organisation | null;
  createdBy?: User | null;
  items?: OrderItem[];
  history?: OrderHistory[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for specifying an item when creating an order.
 */
export interface CreateOrderItemDto {
  productId: string;
  variantId?: string | undefined;
  quantity: number;
}

/**
 * Request body payload for placing a new order.
 */
export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  notes?: string | undefined;
  deliveryAddress?: string | undefined;
  /** Required when placed by SUPER_ADMIN; automatically derived from token for ADMIN / STAFF */
  organisationId?: string | undefined;
}

/**
 * DTO for modifying an item in an order (stock adjustment by Super Admin).
 */
export interface ModifyOrderItemDto {
  productId: string;
  variantId?: string | null | undefined;
  quantity: number;
}

/**
 * Request body payload for Super Admin modifying an order as per stock availability.
 */
export interface ModifyOrderDto {
  items: ModifyOrderItemDto[];
  modificationNote?: string | undefined;
  status?: OrderStatus | undefined;
}

/**
 * Request body payload for Retailer approving a partial/modified order.
 */
export interface ApprovePartialOrderDto {
  notes?: string | undefined;
}

/**
 * Request body payload for Retailer rejecting a partial/modified order.
 */
export interface RejectPartialOrderDto {
  reason?: string | undefined;
}

/**
 * Request body payload for updating an order's status.
 */
export interface UpdateOrderStatusDto {
  status: OrderStatus;
  cancellationReason?: string | undefined;
}

/**
 * Request body payload for cancelling an order.
 */
export interface CancelOrderDto {
  reason?: string | undefined;
  cancellationReason?: string | undefined;
}

/**
 * Filter parameters for querying orders.
 */
export interface OrderFilterParams {
  status?: OrderStatus | undefined;
  organisationId?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

/**
 * Summary statistics for orders dashboard.
 */
export interface OrderSummaryStats {
  totalOrders: number;
  pendingOrders: number;
  awaitingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalRevenue: number;
}

