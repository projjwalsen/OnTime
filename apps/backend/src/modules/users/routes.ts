import { Router } from 'express';
import { listUsers, getUserById, updateProfile } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireOrganisationAdmin } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { updateUserProfileSchema } from './validator';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/users
 * @desc    List users
 * @access  Protected (Admin only)
 */
router.get('/', requireOrganisationAdmin, listUsers);

/**
 * @route   PATCH /api/v1/users/profile
 * @desc    Update profile
 * @access  Protected
 */
router.patch('/profile', validateBody(updateUserProfileSchema), updateProfile);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by id
 * @access  Protected
 */
router.get('/:id', getUserById);

export default router;
