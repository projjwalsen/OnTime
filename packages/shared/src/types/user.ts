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
 * Request payload for inviting a new staff or admin user to an organisation.
 */
export interface InviteUserDto {
  email: string;
  role: UserRole.ADMIN | UserRole.STAFF;
  /** Required when called by SUPER_ADMIN; ignored / automatically derived for ADMIN */
  organisationId?: string;
}


/**
 * Response payload returned when an invitation is successfully created.
 */
export interface InvitationResponse {
  id: string;
  email: string;
  role: UserRole;
  organisationId: string;
  organisationName: string;
  token: string;
  expiresAt: Date;
  status: InvitationStatus;
}
