import { Router } from 'express';
import {
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Public / Authenticated read routes for frontend carousel and banner inspection
router.get('/', listBanners);
router.get('/:id', getBannerById);

// Admin-only banner management
router.post('/', authMiddleware, requireAdmin, createBanner);
router.put('/reorder', authMiddleware, requireAdmin, reorderBanners);
router.patch('/:id', authMiddleware, requireAdmin, updateBanner);
router.delete('/:id', authMiddleware, requireAdmin, deleteBanner);

export default router;

