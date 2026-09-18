/// <reference types="multer" />
import type { Request, Response, NextFunction } from 'express';
import type { AuthContext } from '@ontime/shared';
import { errorResponse } from '../utils/response';

/**
 * Extends the Express Request interface to include authenticated user context
 * and verified organisation scope.
 *
 * IMPORTANT: For organisation-scoped operations, always use `req.user.organisationId`
 * or `req.scopedOrganisationId` — NEVER read organisationId from req.body, req.params,
 * or req.query directly. This is the primary mechanism for enforcing multi-tenant data isolation.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by the authentication middleware after JWT validation.
       * Undefined on unauthenticated routes.
       */
      user?: AuthContext;

      /**
       * Verified organisation ID injected by `scopeToOrganisation` middleware.
       * Guaranteed to match the user's authentic organisation context.
       */
      scopedOrganisationId?: string;
    }
  }
}

/**
 * Type guard: asserts that req.user is populated (i.e., the route is authenticated).
 * Use in controllers after the auth middleware to narrow the type.
 */
export function assertAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    errorResponse(res, 'Authentication required.', 401);
    return;
  }
  next();
}

export type {};
