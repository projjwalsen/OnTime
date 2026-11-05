import { Router } from 'express';
import { getTaxSettings, updateTaxSettings } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireDistributorAdmin } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { updateTaxSettingsSchema } from './validator';

const router = Router();

// All settings routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/settings/tax
 * @desc    Get platform tax settings
 * @access  Protected (All authenticated users: Admin, Staff, Super Admin)
 */
router.get('/tax', getTaxSettings);

/**
 * @route   PUT /api/v1/settings/tax
 * @desc    Update platform tax settings
 * @access  Protected (Distributor Super Admin only)
 */
router.put(
  '/tax',
  requireDistributorAdmin,
  validateBody(updateTaxSettingsSchema),
  updateTaxSettings,
);

export default router;

