import type { Request, Response, RequestHandler } from 'express';
import {
  type LoginCredentialsDto,
  type RefreshTokenDto,
  type ChangePasswordDto,
  type AcceptInvitationDto,
} from '@ontime/shared';
import { authService, AuthError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';

/**
 * Handle Auth errors cleanly with appropriate HTTP status codes.
 */
function handleAuthError(res: Response, error: unknown): void {
  if (error instanceof AuthError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Auth Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred during authentication.', 500);
}

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & return JWT tokens
 * @access  Public
 */
export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const credentials = req.body as LoginCredentialsDto;
      const result = await authService.login(credentials);
      successResponse(res, 'Login successful', result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using a valid refresh token
 * @access  Public
 */
export const refresh: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as RefreshTokenDto;
      const tokens = await authService.refreshTokens(dto.refreshToken);
      successResponse(res, 'Tokens refreshed successfully', { tokens });
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token and log out user
 * @access  Protected
 */
export const logout: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const dto = req.body as RefreshTokenDto | undefined;
      await authService.logout(req.user.userId, dto?.refreshToken);
      successResponse(res, 'Logged out successfully');
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Protected
 */
export const getMe: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const profile = await authService.getMe(req.user.userId);
      successResponse(res, 'User profile retrieved successfully', profile);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Protected
 */
export const changePassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const dto = req.body as ChangePasswordDto;
      await authService.changePassword(req.user.userId, dto);
      successResponse(res, 'Password changed successfully');
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/auth/invite/verify
 * @desc    Verify invitation token before presenting registration form
 * @access  Public
 */
export const verifyInvite: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.query.token as string;
      const result = await authService.verifyInvitation(token);
      successResponse(res, 'Invitation is valid', result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/invite/accept
 * @desc    Accept invitation and register user
 * @access  Public
 */
export const acceptInvite: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as AcceptInvitationDto;
      const result = await authService.acceptInvitation(dto);
      successResponse(res, 'Invitation accepted and account created successfully', result, 201);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);
