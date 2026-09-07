import { UserRole } from '../enums/roles';
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
  /** Populated for organisation users, null for distributor admins */
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
  /** null for DISTRIBUTOR_ADMIN; set to string for ORGANISATION_ADMIN and ORGANISATION_STAFF */
  organisationId: string | null;
  iat?: number;
  exp?: number;
}
