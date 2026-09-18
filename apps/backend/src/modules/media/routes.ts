import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { mediaController } from './controller';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 10, // Max 10 files per request
  },
});

router.use(authMiddleware);
router.use(requireSuperAdmin);

/**
 * @route   POST /api/v1/media/upload
 * @desc    Upload up to 10 product images to Supabase S3 / Storage
 * @access  SUPER_ADMIN only
 */
router.post(
  '/upload',
  upload.any(),
  asyncHandler(mediaController.uploadImages.bind(mediaController)),
);

/**
 * @route   POST /api/v1/media
 * @desc    Alias for upload endpoint
 * @access  SUPER_ADMIN only
 */
router.post('/', upload.any(), asyncHandler(mediaController.uploadImages.bind(mediaController)));

export default router;
export const mediaRoutes = router;
