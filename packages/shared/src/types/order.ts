import { OrderStatus } from '../enums/order-status';
import type { Organisation } from './organisation';
import type { User } from './user';
import type { Product, ProductVariant } from './product';

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
  deliveryAddress?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  deliveredAt?: Date | null;
  organisation?: Organisation | null;
  createdBy?: User | null;
  items?: OrderItem[];
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
  confirmedOrders: number;
  processingOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}
