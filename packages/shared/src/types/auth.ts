import { UserRole } from '../enums/roles';
import { OtpPurpose } from '../enums/otp';
import { User } from './user';
import { Organisation } from './organisation';

/**
 * Credentials required for user login.
 */
export interface LoginCredentialsDto {
  email: string;
  password: string;
}

/**
 * JWT access & refresh token bundle returned upon authentication.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Expiration of the access token in seconds */
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Response payload returned after successful authentication.
 */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  /** Populated for organisation users, null for super admins */
  organisation?: Organisation | null;
}

/**
 * Request payload for refreshing access token.
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * Request payload for changing user password.
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Request payload for accepting an organisation invitation and setting a password.
 */
export interface AcceptInvitationDto {
  token: string;
  name: string;
  password: string;
  mobile?: string;
}

/**
 * Response payload when verifying an invitation token before accepting.
 */
export interface VerifyInvitationResponse {
  email: string;
  role: UserRole;
  organisationId: string;
  organisationName: string;
  expiresAt: Date;
}

/**
 * Decoded payload contained inside signed JWT access tokens.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  /** null for SUPER_ADMIN; set to string for ADMIN and STAFF */
  organisationId: string | null;
  iat?: number;
  exp?: number;
}


/**
 * Request payload for requesting a password reset token.
 */
export interface ForgotPasswordDto {
  email: string;
}

/**
 * Request payload for resetting password with token.
 */
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

/**
 * Request payload for retailer self-registration.
 * Registers both the new retailer organisation and initial admin user account.
 */
export interface RegisterRetailerDto {
  name: string;
  email: string;
  mobile?: string;
  businessName: string;
  address?: string;
  area?: string;
  city?: string;
  taxNumber?: string;
  password: string;
}

// ── OTP Authentication DTOs ─────────────────────────────────

/**
 * Response payload returned after an OTP is generated and sent.
 */
export interface SendOtpResponse {
  message: string;
  expiresInSeconds: number;
  /** Populated only in development/test environment */
  otp?: string;
}

/**
 * Request payload for sending login OTP.
 */
export interface SendLoginOtpDto {
  email: string;
}

/**
 * Request payload for verifying login OTP and obtaining auth tokens.
 */
export interface VerifyLoginOtpDto {
  email: string;
  otp: string;
}

/**
 * Request payload for sending forgot password OTP.
 */
export interface SendForgotPasswordOtpDto {
  email: string;
}

/**
 * Request payload for verifying forgot password OTP.
 */
export interface VerifyForgotPasswordOtpDto {
  email: string;
  otp: string;
}

/**
 * Request payload for resetting password with verified OTP.
 */
export interface ResetPasswordWithOtpDto {
  email: string;
  otp: string;
  newPassword: string;
}

