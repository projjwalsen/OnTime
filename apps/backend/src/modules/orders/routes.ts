import { Router } from 'express';
import {
  createOrder,
  listOrders,
  getOrderStats,
  getOrderById,
  getOrderHistory,
  updateOrderStatus,
  modifyOrderStock,
  approvePartialOrder,
  rejectPartialOrder,
  cancelOrder,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireDistributorAdmin, requireRetailerAdmin } from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  createOrderSchema,
  modifyOrderSchema,
  approvePartialOrderSchema,
  rejectPartialOrderSchema,
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
 * @route   GET /api/v1/orders/:id/history
 * @desc    Get timestamped audit history for an order
 * @access  Protected
 */
router.get('/:id/history', getOrderHistory);

/**
 * @route   PATCH /api/v1/orders/:id/modify or PUT /api/v1/orders/:id/modify
 * @desc    Modify order products/quantities as per stock availability (Super Admin only)
 * @access  Protected (Distributor Super Admin only)
 */
router.patch(
  '/:id/modify',
  requireDistributorAdmin,
  validateBody(modifyOrderSchema),
  modifyOrderStock,
);
router.put(
  '/:id/modify',
  requireDistributorAdmin,
  validateBody(modifyOrderSchema),
  modifyOrderStock,
);

/**
 * @route   POST /api/v1/orders/:id/approve-partial, POST /api/v1/orders/:id/approve
 * @desc    Approve partial/modified order (Retailer Admin only)
 * @access  Protected (Retailer Admin only)
 */
router.post(
  '/:id/approve-partial',
  requireRetailerAdmin,
  validateBody(approvePartialOrderSchema),
  approvePartialOrder,
);
router.post(
  '/:id/approve',
  requireRetailerAdmin,
  validateBody(approvePartialOrderSchema),
  approvePartialOrder,
);

/**
 * @route   POST /api/v1/orders/:id/reject-partial, POST /api/v1/orders/:id/reject
 * @desc    Reject partial/modified order (Retailer Admin/Staff or Super Admin)
 * @access  Protected
 */
router.post(
  '/:id/reject-partial',
  validateBody(rejectPartialOrderSchema),
  rejectPartialOrder,
);
router.post(
  '/:id/reject',
  validateBody(rejectPartialOrderSchema),
  rejectPartialOrder,
);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Transition order fulfillment status (AWAITING, CONFIRMED, PROCESSING, DISPATCHED, DELIVERED, CANCELLED, REJECTED)
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
 * @desc    Cancel an order (Retailer when PENDING/AWAITING, or Super Admin before DELIVERED)
 * @access  Protected
 */
router.post('/:id/cancel', validateBody(cancelOrderSchema), cancelOrder);
router.patch('/:id/cancel', validateBody(cancelOrderSchema), cancelOrder);

export default router;

