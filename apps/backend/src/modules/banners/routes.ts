import { Router } from 'express';
import multer from 'multer';
import {
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  uploadBannerImage,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Configure multer memory storage for banner image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
    files: 5,
  },
});

// Public / Authenticated read routes for frontend carousel and banner inspection
router.get('/', listBanners);
router.get('/:id', getBannerById);

// Admin-only banner management & upload
router.post('/upload', authMiddleware, requireAdmin, upload.any(), uploadBannerImage);
router.post('/', authMiddleware, requireAdmin, createBanner);
router.put('/reorder', authMiddleware, requireAdmin, reorderBanners);
router.patch('/:id', authMiddleware, requireAdmin, updateBanner);
router.delete('/:id', authMiddleware, requireAdmin, deleteBanner);

export default router;

