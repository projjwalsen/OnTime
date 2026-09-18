import type { Request, Response, RequestHandler } from 'express';
import {
  type LoginCredentialsDto,
  type RefreshTokenDto,
  type ChangePasswordDto,
  type AcceptInvitationDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type RegisterRetailerDto,
  type SendLoginOtpDto,
  type VerifyLoginOtpDto,
  type SendForgotPasswordOtpDto,
  type VerifyForgotPasswordOtpDto,
  type ResetPasswordWithOtpDto,
  type SendRegistrationOtpDto,
  type VerifyRegistrationOtpDto,
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

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset token/link
 * @access  Public
 */
export const forgotPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as ForgotPasswordDto;
      const result = await authService.forgotPassword(dto.email);
      successResponse(res, result.message, result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
export const resetPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as ResetPasswordDto;
      await authService.resetPassword(dto);
      successResponse(
        res,
        'Password has been reset successfully. You can now log in with your new password.',
      );
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Self-register retailer organisation and admin user account
 * @access  Public
 */
export const registerRetailer: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as RegisterRetailerDto;
      const result = await authService.registerRetailer(dto);
      successResponse(res, 'Retailer account registered successfully', result, 201);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

// ── OTP Authentication Controllers ───────────────────────────

/**
 * @route   POST /api/v1/auth/otp/login/send
 * @desc    Send verification code for login via email
 * @access  Public
 */
export const sendLoginOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as SendLoginOtpDto;
      const result = await authService.sendLoginOtp(dto.email);
      successResponse(res, result.message, result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/otp/login/verify
 * @desc    Verify login OTP and issue access & refresh tokens
 * @access  Public
 */
export const verifyLoginOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as VerifyLoginOtpDto;
      const result = await authService.verifyLoginOtp(dto);
      successResponse(res, 'Login successful', result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/otp/forgot-password/send
 * @desc    Send password reset OTP via email
 * @access  Public
 */
export const sendForgotPasswordOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as SendForgotPasswordOtpDto;
      const result = await authService.sendForgotPasswordOtp(dto.email);
      successResponse(res, result.message, result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/otp/forgot-password/verify
 * @desc    Verify password reset OTP
 * @access  Public
 */
export const verifyForgotPasswordOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as VerifyForgotPasswordOtpDto;
      const result = await authService.verifyForgotPasswordOtp(dto);
      successResponse(res, result.message, result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/otp/forgot-password/reset
 * @desc    Reset password using OTP code
 * @access  Public
 */
export const resetPasswordWithOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as ResetPasswordWithOtpDto;
      await authService.resetPasswordWithOtp(dto);
      successResponse(
        res,
        'Password has been reset successfully. You can now log in with your new password.',
      );
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/otp/register/send
 * @desc    Resend / send verification code for retailer registration
 * @access  Public
 */
export const sendRegistrationOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as SendRegistrationOtpDto;
      const result = await authService.sendRegistrationOtp(dto.email);
      successResponse(res, result.message, result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/otp/register/verify
 * @desc    Verify retailer registration OTP
 * @access  Public
 */
export const verifyRegistrationOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as VerifyRegistrationOtpDto;
      const result = await authService.verifyRegistrationOtp(dto);
      successResponse(res, result.message, result);
    } catch (error) {
      handleAuthError(res, error);
    }
  },
);
