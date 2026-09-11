import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  verifyInvite,
  acceptInvite,
  forgotPassword,
  resetPassword,
  registerRetailer,
  sendLoginOtp,
  verifyLoginOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  acceptInvitationSchema,
  verifyInvitationQuerySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerRetailerSchema,
  sendLoginOtpSchema,
  verifyLoginOtpSchema,
  sendForgotPasswordOtpSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordWithOtpSchema,
  sendRegistrationOtpSchema,
  verifyRegistrationOtpSchema,
} from './validator';

const router = Router();

// ── Public Routes ──────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/register
 * @desc    Self-register a new retailer organisation and admin account
 * @access  Public
 */
router.post('/register', validateBody(registerRetailerSchema), registerRetailer);
router.post('/register-retailer', validateBody(registerRetailerSchema), registerRetailer);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & issue tokens
 * @access  Public
 */
router.post('/login', validateBody(loginSchema), login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateBody(refreshTokenSchema), refresh);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset link/token
 * @access  Public
 */
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 */
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

/**
 * @route   GET /api/v1/auth/invite/verify
 * @desc    Verify invitation token
 * @access  Public
 */
router.get('/invite/verify', validateRequest({ query: verifyInvitationQuerySchema }), verifyInvite);

/**
 * @route   POST /api/v1/auth/invite/accept
 * @desc    Accept invitation & complete onboarding
 * @access  Public
 */
router.post('/invite/accept', validateBody(acceptInvitationSchema), acceptInvite);

// ── OTP Authentication Routes ────────────────────────────────

/**
 * @route   POST /api/v1/auth/otp/login/send
 * @desc    Send verification code for login via email
 * @access  Public
 */
router.post('/otp/login/send', validateBody(sendLoginOtpSchema), sendLoginOtp);

/**
 * @route   POST /api/v1/auth/otp/login/verify
 * @desc    Verify login OTP and issue access & refresh tokens
 * @access  Public
 */
router.post('/otp/login/verify', validateBody(verifyLoginOtpSchema), verifyLoginOtp);

/**
 * @route   POST /api/v1/auth/otp/forgot-password/send
 * @desc    Send password reset OTP code via email
 * @access  Public
 */
router.post('/otp/forgot-password/send', validateBody(sendForgotPasswordOtpSchema), sendForgotPasswordOtp);

/**
 * @route   POST /api/v1/auth/otp/forgot-password/verify
 * @desc    Verify password reset OTP code
 * @access  Public
 */
router.post('/otp/forgot-password/verify', validateBody(verifyForgotPasswordOtpSchema), verifyForgotPasswordOtp);

/**
 * @route   POST /api/v1/auth/otp/forgot-password/reset
 * @desc    Reset password using verified OTP code
 * @access  Public
 */
router.post('/otp/forgot-password/reset', validateBody(resetPasswordWithOtpSchema), resetPasswordWithOtp);

/**
 * @route   POST /api/v1/auth/otp/register/send
 * @desc    Resend / send verification code for retailer registration via email
 * @access  Public
 */
router.post('/otp/register/send', validateBody(sendRegistrationOtpSchema), sendRegistrationOtp);

/**
 * @route   POST /api/v1/auth/otp/register/verify
 * @desc    Verify retailer registration OTP code
 * @access  Public
 */
router.post('/otp/register/verify', validateBody(verifyRegistrationOtpSchema), verifyRegistrationOtp);

// ── Protected Routes ───────────────────────────────────────


/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Protected
 */
router.get('/me', authMiddleware, getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token & log out
 * @access  Protected
 */
router.post('/logout', authMiddleware, logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password
 * @access  Protected
 */
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), changePassword);

export default router;
