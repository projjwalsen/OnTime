/**
 * Order status lifecycle enum.
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

/**
 * Returns true if the given order status can be cancelled by a retailer user.
 * Retailers can only cancel orders while in PENDING status.
 */
export function isRetailerCancellable(status: OrderStatus): boolean {
  return status === OrderStatus.PENDING;
}

/**
 * Returns true if the order status allows cancellation by super admin.
 * Super admins can cancel orders before they are DELIVERED or already CANCELLED.
 */
export function isDistributorCancellable(status: OrderStatus): boolean {
  return status !== OrderStatus.DELIVERED && status !== OrderStatus.CANCELLED;
}

/**
 * Valid lifecycle state transitions for order fulfillment.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
  [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};
