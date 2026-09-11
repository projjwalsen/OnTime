import { UserRole } from '../enums/roles';
import { InvitationStatus } from '../enums/invitation-status';
import type { Organisation } from './organisation';

/**
 * Shared User interface.
 *
 * SUPER_ADMIN users have organisationId = null.
 * ADMIN and STAFF users always have an organisationId.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  mobile?: string | null;
  role: UserRole;
  /** null for SUPER_ADMIN users; required for organisation users */
  organisationId: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  organisation?: Organisation | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents the authenticated user context derived from a JWT token.
 * This is attached to every authenticated request.
 *
 * NOTE: organisationId is NEVER read from the request body/params for
 * organisation-scoped operations — it is always derived from this context.
 */
export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  /** Always present for organisation users; null for super admins */
  organisationId: string | null;
}

/**
 * Request payload for onboarding a new staff or admin user to an organisation.
 * An auto-generated temporary password will be created and emailed to the user.
 */
export interface OnboardUserDto {
  name: string;
  email: string;
  role: UserRole.ADMIN | UserRole.STAFF;
  mobile?: string;
  /** Required when called by SUPER_ADMIN; ignored / automatically derived for ADMIN */
  organisationId?: string;
}

/**
 * Backward-compatible alias for OnboardUserDto.
 */
export type InviteUserDto = OnboardUserDto;

/**
 * Response payload returned when a staff or admin user is onboarded.
 */
export interface OnboardUserResponse {
  user: User;
  /** Auto-generated temporary password (populated only in development/test environment) */
  temporaryPassword?: string | undefined;
}

/**
 * Backward-compatible response payload interface.
 */
export interface InvitationResponse {
  id: string;
  email: string;
  role: UserRole;
  organisationId: string;
  organisationName: string;
  token?: string;
  expiresAt?: Date;
  status?: InvitationStatus;
  user?: User;
  temporaryPassword?: string | undefined;
}

