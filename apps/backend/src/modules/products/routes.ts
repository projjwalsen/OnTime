import { Router } from 'express';
import {
  listProducts,
  createProduct,
  getProductById,
  updateProduct,
  getRecentPurchases,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireDistributorAdmin } from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productFilterQuerySchema,
} from './validator';

const router = Router();

router.use(authMiddleware);

/**
 * @route   GET /api/v1/products/recent-purchases (and /recent-purchase, /recent-purchased, /recent)
 * @desc    Get recently purchased products for authenticated retailer organisation / user
 * @access  Protected
 */
router.get(
  '/recent-purchases',
  validateRequest({ query: productFilterQuerySchema }),
  getRecentPurchases,
);
router.get(
  '/recent-purchase',
  validateRequest({ query: productFilterQuerySchema }),
  getRecentPurchases,
);
router.get(
  '/recent-purchased',
  validateRequest({ query: productFilterQuerySchema }),
  getRecentPurchases,
);
router.get(
  '/recent',
  validateRequest({ query: productFilterQuerySchema }),
  getRecentPurchases,
);

/**
 * @route   GET /api/v1/products
 * @desc    List and search products with global search (name, category, sku, id, description, unit, packaging note, price) & filters
 * @access  Protected
 */
router.get('/', validateRequest({ query: productFilterQuerySchema }), listProducts);

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
