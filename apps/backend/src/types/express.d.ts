import type { Request, Response, NextFunction } from 'express';
import type { AuthContext } from '@ontime/shared';

/**
 * Extends the Express Request interface to include authenticated user context.
 *
 * IMPORTANT: For organisation-scoped operations, always use `req.user.organisationId`
 * from this context — NEVER read organisationId from req.body, req.params, or req.query.
 * This is the primary mechanism for enforcing data isolation.
 *
 * Future authentication middleware will populate req.user after validating the JWT.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by the authentication middleware after JWT validation.
       * Undefined on unauthenticated routes.
       */
      user?: AuthContext;
    }
  }
}

/**
 * Type guard: asserts that req.user is populated (i.e., the route is authenticated).
 * Use in controllers after the auth middleware to narrow the type.
 */
export function assertAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorised' });
    return;
  }
  next();
}

export type {};
