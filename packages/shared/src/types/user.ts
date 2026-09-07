import { UserRole } from '../enums/roles';
import type { Organisation } from './organisation';

/**
 * Shared User interface.
 *
 * DISTRIBUTOR_ADMIN users have organisationId = null.
 * ORGANISATION_ADMIN and ORGANISATION_STAFF users always have an organisationId.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  mobile?: string | null;
  role: UserRole;
  /** null for DISTRIBUTOR_ADMIN users; required for organisation users */
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
  /** Always present for organisation users; null for distributor admins */
  organisationId: string | null;
}
