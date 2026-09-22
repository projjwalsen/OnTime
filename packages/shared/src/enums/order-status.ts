/**
 * Order status lifecycle enum.
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  AWAITING = 'AWAITING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/**
 * Returns true if the given order status can be cancelled by a retailer user.
 * Retailers can cancel orders while in PENDING or AWAITING status.
 */
export function isRetailerCancellable(status: OrderStatus): boolean {
  return status === OrderStatus.PENDING || status === OrderStatus.AWAITING;
}

/**
 * Returns true if the order status allows cancellation by super admin.
 * Super admins can cancel orders before they are DELIVERED, REJECTED, or already CANCELLED.
 */
export function isDistributorCancellable(status: OrderStatus): boolean {
  return (
    status !== OrderStatus.DELIVERED &&
    status !== OrderStatus.CANCELLED &&
    status !== OrderStatus.REJECTED
  );
}

/**
 * Valid lifecycle state transitions for order fulfillment.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.AWAITING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.AWAITING]: [
    OrderStatus.PROCESSING,
    OrderStatus.CONFIRMED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
  [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
};
