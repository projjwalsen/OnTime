import { Router } from 'express';
import { healthRoutes } from '../../modules/health';
import { authRoutes } from '../../modules/auth';
import { usersRoutes } from '../../modules/users';
import { organisationsRoutes } from '../../modules/organisations';
import { productsRoutes } from '../../modules/products';
import { categoriesRoutes } from '../../modules/categories';
import { ordersRoutes } from '../../modules/orders';
import { mediaRoutes } from '../../modules/media';

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
 * @route  /api/v1/media
 * @desc   Media & product image upload endpoints (Super Admin only)
 */
router.use('/media', mediaRoutes);

export default router;

