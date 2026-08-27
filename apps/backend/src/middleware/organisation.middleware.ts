import type { Request, Response, NextFunction } from 'express';

/**
 * Organisation Scoping Middleware (STUB)
 *
 * This is a placeholder for future organisation-level access control.
 * When implemented, this middleware will:
 *   1. Derive the user's organisationId from req.user (populated by authMiddleware).
 *   2. Ensure that all data operations are scoped to that organisation.
 *   3. Reject requests that attempt to access data of a different organisation.
 *
 * CRITICAL SECURITY RULE:
 *   The organisationId used for database queries must ALWAYS come from the
 *   authenticated user's context (req.user.organisationId), NEVER from the
 *   request body, query parameters, or URL parameters.
 *
 *   This prevents a retailer from accessing another retailer's data by
 *   simply passing a different organisationId in their request.
 *
 * Example (future implementation):
 *   export function scopeToOrganisation(req: Request, res: Response, next: NextFunction) {
 *     if (!req.user?.organisationId) {
 *       return res.status(403).json({ success: false, message: 'No organisation context' });
 *     }
 *     // req.user.organisationId is now safe to use in service/repository layer
 *     next();
 *   }
 */
export function scopeToOrganisation(_req: Request, _res: Response, next: NextFunction): void {
  // TODO: Implement organisation scoping in the access control task.
  // Placeholder: proceed without scoping for now.
  next();
}
