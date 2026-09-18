import type { Request, Response, RequestHandler } from 'express';
import { usersService, UserError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type UpdateUserProfileInput,
  type OnboardUserInput,
  type UserFilterInput,
} from './validator';

function handleUserError(res: Response, error: unknown): void {
  if (error instanceof UserError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Users Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in user operations.', 500);
}

/**
 * @route   GET /api/v1/users
 * @desc    List users with search, filter, and pagination (scoped to caller organisation or all for distributor)
 * @access  Protected (Requires Admin)
 */
export const listUsers: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'Unauthorised', 401);
      return;
    }
    const filters = req.query as unknown as UserFilterInput;
    const result = await usersService.listUsers(req.user, filters);
    successResponse(res, 'Users retrieved successfully', result);
  },
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Protected
 */
export const getUserById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) {
      errorResponse(res, 'User ID is required', 400);
      return;
    }
    const user = await usersService.getUserById(id);
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }
    // Verify organisation boundary
    if (req.user?.organisationId && user.organisationId !== req.user.organisationId) {
      errorResponse(res, 'Forbidden: Cannot access user outside your organisation', 403);
      return;
    }
    successResponse(res, 'User retrieved successfully', { user });
  },
);

/**
 * @route   PATCH /api/v1/users/profile
 * @desc    Update current user profile
 * @access  Protected
 */
export const updateProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'Unauthorised', 401);
      return;
    }
    const dto = req.body as UpdateUserProfileInput;
    const updated = await usersService.updateUserProfile(req.user.userId, dto);
    successResponse(res, 'Profile updated successfully', { user: updated });
  },
);

/**
 * @route   POST /api/v1/users/onboard
 * @desc    Onboard a new user with auto-generated credentials
 * @access  Protected (Super Admin or Admin)
 */
export const onboardUser: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const dto = req.body as OnboardUserInput;
      const result = await usersService.onboardUser(req.user, dto);
      successResponse(
        res,
        'Staff member onboarded successfully. Credentials have been sent to their email.',
        result,
        201,
      );
    } catch (error) {
      handleUserError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/users/invite
 * @desc    Invite / onboard a new user (Org Admin or Staff) to an organisation
 * @access  Protected (Super Admin or Admin)
 */
export const inviteUser: RequestHandler = onboardUser;
