import { Router } from 'express';
import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// All coupon endpoints require authentication
router.use(authMiddleware);

// Customer & Admin checkout coupon validation
router.post('/validate', validateCoupon);

// Admin-only management endpoints
router.get('/', requireAdmin, listCoupons);
router.get('/:id', requireAdmin, getCouponById);
router.post('/', requireAdmin, createCoupon);
router.patch('/:id', requireAdmin, updateCoupon);
router.delete('/:id', requireAdmin, deleteCoupon);

export default router;

