import { Router } from 'express';
import {
  listCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireDistributorAdmin } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createCategorySchema, updateCategorySchema } from './validator';

const router = Router();

router.use(authMiddleware);

/**
 * @route   GET /api/v1/categories
 * @desc    List all categories with product count
 * @access  Protected (All users)
 */
router.get('/', listCategories);

/**
 * @route   POST /api/v1/categories
 * @desc    Create a category
 * @access  Protected (Distributor Admin)
 */
router.post('/', requireDistributorAdmin, validateBody(createCategorySchema), createCategory);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category details and its products
 * @access  Protected (All users)
 */
router.get('/:id', getCategoryById);

/**
 * @route   PATCH /api/v1/categories/:id
 * @desc    Update category details
 * @access  Protected (Distributor Admin)
 */
router.patch('/:id', requireDistributorAdmin, validateBody(updateCategorySchema), updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category
 * @access  Protected (Distributor Admin)
 */
router.delete('/:id', requireDistributorAdmin, deleteCategory);

export default router;
