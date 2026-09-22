import { Router } from 'express';
import { getPreferences, updatePreferences } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { updateNotificationPreferencesSchema } from './validator';

const router = Router();

router.use(authMiddleware);

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get user's notification preferences
 * @access  Protected
 */
router.get('/preferences', getPreferences);

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update user's notification preferences
 * @access  Protected
 */
router.put('/preferences', validateBody(updateNotificationPreferencesSchema), updatePreferences);

export default router;
