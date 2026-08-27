import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@ontime/shared';

/**
 * RBAC Middleware (STUB)
 *
 * This is a placeholder for future Role-Based Access Control.
 * When implemented, this middleware factory will:
 *   1. Accept an array of allowed roles.
 *   2. Check req.user.role against the allowed roles.
 *   3. Return 403 Forbidden if the user's role is not permitted.
 *   4. Call next() if the role is permitted.
 *
 * Usage (future):
 *   router.post('/organisations', requireRoles([UserRole.DISTRIBUTOR_ADMIN]), createOrg);
 *   router.post('/invitations', requireRoles([UserRole.ORGANISATION_ADMIN]), inviteStaff);
 *
 * CRITICAL RULES:
 *   - ORGANISATION_STAFF must NEVER be granted invitation or org-management permissions.
 *   - Only DISTRIBUTOR_ADMIN can create/manage retailer organisations.
 *   - Only ORGANISATION_ADMIN can invite staff to their own organisation.
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // TODO: Implement role check against req.user.role in the RBAC task.
    // Placeholder: permit all for now.
    void allowedRoles;
    next();
  };
}

/**
 * Distributor-only access guard (STUB).
 * Shorthand for requireRoles([UserRole.DISTRIBUTOR_ADMIN]).
 */
export function requireDistributorAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.DISTRIBUTOR_ADMIN])(req, res, next);
}

/**
 * Organisation admin or above access guard (STUB).
 */
export function requireOrganisationAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.DISTRIBUTOR_ADMIN, UserRole.ORGANISATION_ADMIN])(req, res, next);
}
