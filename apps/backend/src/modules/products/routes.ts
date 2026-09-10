import { Router } from 'express';
import { listProducts, createProduct, getProductById, updateProduct } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireDistributorAdmin } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from './validator';

const router = Router();

router.use(authMiddleware);

/**
 * @route   GET /api/v1/products
 * @desc    List products
 * @access  Protected
 */
router.get('/', listProducts);

/**
 * @route   POST /api/v1/products
 * @desc    Create product
 * @access  Protected (Distributor Admin)
 */
router.post('/', requireDistributorAdmin, validateBody(createProductSchema), createProduct);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product details
 * @access  Protected
 */
router.get('/:id', getProductById);

/**
 * @route   PATCH /api/v1/products/:id
 * @desc    Update product
 * @access  Protected (Distributor Admin)
 */
router.patch('/:id', requireDistributorAdmin, validateBody(updateProductSchema), updateProduct);

export default router;
