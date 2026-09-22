import { Router } from 'express';
import { healthRoutes } from '../../modules/health';
import { authRoutes } from '../../modules/auth';
import { usersRoutes } from '../../modules/users';
import { organisationsRoutes } from '../../modules/organisations';
import { productsRoutes } from '../../modules/products';
import { categoriesRoutes } from '../../modules/categories';
import { ordersRoutes } from '../../modules/orders';
import { draftOrdersRoutes } from '../../modules/draft-orders';
import { mediaRoutes } from '../../modules/media';
import { addressesRoutes } from '../../modules/addresses';
import { notificationsRoutes } from '../../modules/notifications';
import { supportRoutes } from '../../modules/support';
import { helpRoutes } from '../../modules/help';

const router = Router();

/**
 * @route  /api/v1/health
 * @desc   Health check endpoint
 */
router.use('/health', healthRoutes);

/**
 * @route  /api/v1/auth
 * @desc   Authentication & session management endpoints
 */
router.use('/auth', authRoutes);

/**
 * @route  /api/v1/users
 * @desc   Users & profile management endpoints
 */
router.use('/users', usersRoutes);

/**
 * @route  /api/v1/organisations
 * @desc   Retailer organisation management endpoints
 */
router.use('/organisations', organisationsRoutes);

/**
 * @route  /api/v1/products
 * @desc   Catalog & product management endpoints
 */
router.use('/products', productsRoutes);

/**
 * @route  /api/v1/categories
 * @desc   Category management endpoints
 */
router.use('/categories', categoriesRoutes);

/**
 * @route  /api/v1/orders
 * @desc   Order management & fulfillment endpoints
 */
router.use('/orders', ordersRoutes);

/**
 * @route  /api/v1/draft-orders
 * @desc   Draft order management endpoints (Retailer Admin / Staff only)
 */
router.use('/draft-orders', draftOrdersRoutes);

/**
 * @route  /api/v1/media
 * @desc   Media & product image upload endpoints (Super Admin only)
 */
router.use('/media', mediaRoutes);

/**
 * @route  /api/v1/addresses
 * @desc   Retailer delivery address management endpoints
 */
router.use('/addresses', addressesRoutes);

/**
 * @route  /api/v1/notifications
 * @desc   User notification preferences endpoints
 */
router.use('/notifications', notificationsRoutes);

/**
 * @route  /api/v1/support
 * @desc   Customer support tickets & topics endpoints
 */
router.use('/support', supportRoutes);

/**
 * @route  /api/v1/help
 * @desc   Help center categories and articles endpoints
 */
router.use('/help', helpRoutes);

export default router;

