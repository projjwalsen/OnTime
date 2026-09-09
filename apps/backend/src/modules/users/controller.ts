import type { Request, Response, RequestHandler } from 'express';
import { usersService, UserError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type UpdateUserProfileInput, type InviteUserInput } from './validator';

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
 * @desc    List users (scoped to caller organisation or all for distributor)
 * @access  Protected (Requires Admin)
 */
export const listUsers: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organisationId = req.user?.organisationId ?? undefined;
    const users = await usersService.listUsers({ organisationId });
    successResponse(res, 'Users retrieved successfully', { users });
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
 * @route   POST /api/v1/users/invite
 * @desc    Invite a new user (Org Admin or Staff) to an organisation
 * @access  Protected (Distributor Admin or Org Admin)
 */
export const inviteUser: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const dto = req.body as InviteUserInput;
      const invitation = await usersService.inviteUser(req.user, dto);
      successResponse(res, 'Invitation created successfully', { invitation }, 201);
    } catch (error) {
      handleUserError(res, error);
    }
  },
);
