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
 *   - STAFF must NEVER be granted invitation or org-management permissions.
 *   - Only SUPER_ADMIN can create/manage retailer organisations and global catalog.
 *   - Only ADMIN can invite staff to their own organisation.
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
 * Super Admin (Platform Owner) only access guard.
 * Allows only SUPER_ADMIN.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.SUPER_ADMIN])(req, res, next);
}

/**
 * Organisation Admin or Super Admin access guard.
 * Allows SUPER_ADMIN and ADMIN.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN])(req, res, next);
}

/**
 * Organisation member access guard.
 * Allows any authenticated user belonging to an organisation (ADMIN or STAFF).
 */
export function requireOrganisationUser(req: Request, res: Response, next: NextFunction): void {
  return requireRoles([UserRole.ADMIN, UserRole.STAFF])(req, res, next);
}

// Backward-compatibility aliases
export const requireDistributorAdmin = requireSuperAdmin;
export const requireOrganisationAdmin = requireAdmin;
