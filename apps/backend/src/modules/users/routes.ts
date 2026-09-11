import { Router } from 'express';
import { listUsers, getUserById, updateProfile, inviteUser, onboardUser } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireOrganisationAdmin } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { updateUserProfileSchema, inviteUserSchema, onboardUserSchema } from './validator';

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
 * @route   POST /api/v1/users/onboard
 * @desc    Onboard a new user (Staff or Admin) with auto-generated credentials
 * @access  Protected (Super Admin or Admin)
 */
router.post('/onboard', requireOrganisationAdmin, validateBody(onboardUserSchema), onboardUser);

/**
 * @route   POST /api/v1/users/invite
 * @desc    Onboard / invite a user (Staff or Admin) to an organisation
 * @access  Protected (Super Admin or Admin)
 */
router.post('/invite', requireOrganisationAdmin, validateBody(inviteUserSchema), inviteUser);

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
