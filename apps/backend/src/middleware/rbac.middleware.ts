import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@ontime/shared';
import { errorResponse } from '../utils/response';

/**
 * Role-Based Access Control (RBAC) Middleware Factory.
 *
 * Accepts an array of allowed roles and ensures the authenticated user
 * has one of the specified roles before allowing access to the route.
 *
 * CRITICAL RULES:
 *   - ORGANISATION_STAFF must NEVER be granted invitation or org-management permissions.
 *   - Only DISTRIBUTOR_ADMIN can create/manage retailer organisations and products.
 *   - Only ORGANISATION_ADMIN can invite staff to their own organisation.
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Authentication required before checking permissions.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      errorResponse(
        res,
        'Forbidden: You do not have the required permissions to access this resource.',
        403,
      );
      return;
    }

    next();
  };
}

/**
 * Distributor-only access guard.
 * Allows only DISTRIBUTOR_ADMIN.
 */
export function requireDistributorAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.DISTRIBUTOR_ADMIN])(req, res, next);
}

/**
 * Organisation Admin or Platform Admin access guard.
 * Allows DISTRIBUTOR_ADMIN and ORGANISATION_ADMIN.
 */
export function requireOrganisationAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.DISTRIBUTOR_ADMIN, UserRole.ORGANISATION_ADMIN])(req, res, next);
}

/**
 * Organisation member access guard.
 * Allows any authenticated user belonging to an organisation (ORGANISATION_ADMIN or ORGANISATION_STAFF).
 */
export function requireOrganisationUser(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_STAFF])(req, res, next);
}
