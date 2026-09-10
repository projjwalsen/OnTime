import type { Request, Response, NextFunction } from 'express';
import { isSuperAdmin } from '@ontime/shared';
import { errorResponse } from '../utils/response';

/**
 * Organisation Scoping Middleware
 *
 * Enforces multi-organisation data isolation at the backend layer.
 *
 * CRITICAL SECURITY RULE:
 *   The organisationId used for database queries must ALWAYS come from the
 *   authenticated user's context (req.user.organisationId), NEVER trusted from
 *   request body, query parameters, or URL parameters.
 *
 *   This prevents a retailer from accessing another retailer's data by
 *   simply passing a different organisationId in their request.
 *
 * Behavior:
 *   - For ADMIN / STAFF:
 *     Injects req.scopedOrganisationId = req.user.organisationId.
 *     Rejects requests with 403 if the user has no organisationId.
 *
 *   - For SUPER_ADMIN:
 *     Allows access across all organisations. If an organisationId is explicitly
 *     specified in params or query (e.g., /organisations/:orgId/orders), sets
 *     req.scopedOrganisationId to that target organisation.
 */
export function scopeToOrganisation(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    errorResponse(res, 'Authentication required before scoping organisation context.', 401);
    return;
  }

  // Super Admin has cross-organisation platform access
  if (isSuperAdmin(req.user.role)) {

    const targetOrgId =
      req.params.organisationId ||
      req.params.orgId ||
      (req.query.organisationId as string | undefined);

    if (targetOrgId) {
      req.scopedOrganisationId = targetOrgId;
    }
    next();
    return;
  }

  // Organisation users are strictly restricted to their own organisation
  if (!req.user.organisationId) {
    errorResponse(res, 'Forbidden: No organisation context associated with your account.', 403);
    return;
  }

  req.scopedOrganisationId = req.user.organisationId;
  next();
}
