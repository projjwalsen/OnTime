import type { Request, Response, RequestHandler } from 'express';
import { ordersService, OrderError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type CreateOrderInput,
  type UpdateOrderStatusInput,
  type CancelOrderInput,
  type OrderFilterInput,
} from './validator';

function handleOrderError(res: Response, error: unknown): void {
  if (error instanceof OrderError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Orders Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in order operations.', 500);
}

/**
 * @route   POST /api/v1/orders
 * @desc    Place a new wholesale order
 * @access  Protected (Admin, Staff, Super Admin)
 */
export const createOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as CreateOrderInput;
      const order = await ordersService.createOrder(req.user!, dto);
      successResponse(res, 'Order placed successfully', { order }, 201);
    } catch (error) {
      handleOrderError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/orders
 * @desc    List orders with multi-tenant scoping and filters
 * @access  Protected (Admin, Staff, Super Admin)
 */
export const listOrders: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query as unknown as OrderFilterInput;
      const result = await ordersService.listOrders(req.user!, filters);
      successResponse(res, 'Orders retrieved successfully', result);
    } catch (error) {
      handleOrderError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/orders/summary/stats
 * @desc    Get order dashboard summary counts and revenue statistics
 * @access  Protected (Admin, Super Admin)
 */
export const getOrderStats: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organisationId = req.query.organisationId as string | undefined;
      const stats = await ordersService.getOrderStats(req.user!, organisationId);
      successResponse(res, 'Order statistics retrieved successfully', { stats });
    } catch (error) {
      handleOrderError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order details by ID
 * @access  Protected (Admin, Staff, Super Admin)
 */
export const getOrderById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Order ID is required', 400);
        return;
      }
      const order = await ordersService.getOrderById(req.user!, id);
      successResponse(res, 'Order retrieved successfully', { order });
    } catch (error) {
      handleOrderError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status (Distributor Super Admin)
 * @access  Protected (Super Admin)
 */
export const updateOrderStatus: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Order ID is required', 400);
        return;
      }
      const dto = req.body as UpdateOrderStatusInput;
      const order = await ordersService.updateOrderStatus(req.user!, id, dto);
      successResponse(res, `Order status updated to "${order.status}" successfully`, { order });
    } catch (error) {
      handleOrderError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel an order (Retailer while PENDING, or Super Admin before DELIVERED)
 * @access  Protected (Admin, Staff, Super Admin)
 */
export const cancelOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Order ID is required', 400);
        return;
      }
      const body = req.body as CancelOrderInput;
      const reason = body?.cancellationReason || body?.reason;
      const order = await ordersService.cancelOrder(req.user!, id, reason);
      successResponse(res, 'Order cancelled successfully', { order });
    } catch (error) {
      handleOrderError(res, error);
    }
  },
);
