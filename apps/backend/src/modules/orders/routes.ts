import { Router } from 'express';
import {
  createOrder,
  listOrders,
  getOrderStats,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireDistributorAdmin } from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderFilterQuerySchema,
} from './validator';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/v1/orders
 * @desc    Place a new wholesale order
 * @access  Protected (All authenticated users: Admin, Staff, Super Admin)
 */
router.post('/', validateBody(createOrderSchema), createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    List orders with multi-tenant scoping and filters
 * @access  Protected
 */
router.get('/', validateRequest({ query: orderFilterQuerySchema }), listOrders);

/**
 * @route   GET /api/v1/orders/summary/stats, /api/v1/orders/stats/summary, /api/v1/orders/stats
 * @desc    Get order dashboard summary statistics
 * @access  Protected
 */
router.get('/summary/stats', getOrderStats);
router.get('/stats/summary', getOrderStats);
router.get('/stats', getOrderStats);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order details by ID
 * @access  Protected
 */
router.get('/:id', getOrderById);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Transition order fulfillment status (CONFIRMED, PROCESSING, DISPATCHED, DELIVERED, CANCELLED)
 * @access  Protected (Distributor Super Admin only)
 */
router.patch(
  '/:id/status',
  requireDistributorAdmin,
  validateBody(updateOrderStatusSchema),
  updateOrderStatus,
);

/**
 * @route   POST /api/v1/orders/:id/cancel or PATCH /api/v1/orders/:id/cancel
 * @desc    Cancel an order (Retailer when PENDING, or Super Admin before DELIVERED)
 * @access  Protected
 */
router.post('/:id/cancel', validateBody(cancelOrderSchema), cancelOrder);
router.patch('/:id/cancel', validateBody(cancelOrderSchema), cancelOrder);

export default router;
