import type { Request, Response, NextFunction } from 'express';

/**
 * Authentication Middleware (STUB)
 *
 * This is a placeholder for future JWT authentication.
 * When implemented, this middleware will:
 *   1. Extract the JWT from the Authorization header (Bearer token).
 *   2. Verify the token signature and expiry.
 *   3. Decode the payload and populate req.user (AuthContext).
 *   4. Call next() if valid, or return 401 if invalid/missing.
 *
 * The AuthContext will include:
 *   - userId
 *   - email
 *   - role (UserRole)
 *   - organisationId (null for DISTRIBUTOR_ADMIN)
 *
 * NOTE: organisationId from the JWT is the source of truth for data isolation.
 *       It must NEVER be read from request body or query parameters.
 */
export function authMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  // TODO: Implement JWT verification in the authentication task.
  // Placeholder: proceed without authentication for now.
  next();
}
