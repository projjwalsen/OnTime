import { Router } from 'express';
import {
  listUsers,
  getUserById,
  updateProfile,
  inviteUser,
  onboardUser,
  getTeamOverview,
  updateUserRole,
  updateUserStatus,
  revokeInvitation,
} from './controller';

import { authMiddleware } from '../../middleware/auth.middleware';
import { requireOrganisationAdmin } from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  updateUserProfileSchema,
  inviteUserSchema,
  onboardUserSchema,
  userFilterQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from './validator';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/users/team
 * @desc    Get complete team overview (members + pending invites + stats)
 * @access  Protected (Admin only)
 */
router.get('/team', requireOrganisationAdmin, getTeamOverview);

/**
 * @route   GET /api/v1/users
 * @desc    List users with search, filter, and pagination
 * @access  Protected (Admin only)
 */
router.get(
  '/',
  requireOrganisationAdmin,
  validateRequest({ query: userFilterQuerySchema }),
  listUsers,
);

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
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user role (ADMIN or STAFF)
 * @access  Protected (Admin only)
 */
router.patch('/:id/role', requireOrganisationAdmin, validateBody(updateUserRoleSchema), updateUserRole);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Activate or deactivate user
 * @access  Protected (Admin only)
 */
router.patch(
  '/:id/status',
  requireOrganisationAdmin,
  validateBody(updateUserStatusSchema),
  updateUserStatus,
);

/**
 * @route   DELETE /api/v1/users/invitations/:id
 * @desc    Revoke pending organisation invitation
 * @access  Protected (Admin only)
 */
router.delete('/invitations/:id', requireOrganisationAdmin, revokeInvitation);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by id
 * @access  Protected
 */
router.get('/:id', getUserById);

export default router;

