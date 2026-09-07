import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { type AuthContext, UserRole, isOrganisationUser } from '@ontime/shared';
import { verifyAccessToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/async-handler';

/**
 * Authentication Middleware
 *
 * Enforces JWT authentication on protected routes.
 * 1. Extracts Bearer token from the Authorization header.
 * 2. Verifies token validity and signature.
 * 3. Checks that the user is active in the database and their organisation (if any) is not suspended.
 * 4. Injects verified `req.user: AuthContext` into the request.
 */
export const authMiddleware: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'Authentication required. Please provide a valid Bearer token.', 401);
      return;
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      errorResponse(res, 'Authentication token is empty.', 401);
      return;
    }

    try {
      const payload = verifyAccessToken(token);

      // Verify user status in database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          organisation: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!user) {
        errorResponse(res, 'User account no longer exists.', 401);
        return;
      }

      if (!user.isActive) {
        errorResponse(res, 'User account is deactivated. Please contact support.', 403);
        return;
      }

      const role = user.role as unknown as UserRole;

      // If organisation user, verify organisation is not suspended
      if (isOrganisationUser(role) && user.organisation) {
        if (user.organisation.status === 'SUSPENDED') {
          errorResponse(
            res,
            'Your organisation has been suspended. Please contact the distributor.',
            403,
          );
          return;
        }
      }

      const authContext: AuthContext = {
        userId: user.id,
        email: user.email,
        role,
        organisationId: user.organisationId,
      };

      req.user = authContext;
      next();
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'TokenExpiredError') {
        errorResponse(res, 'Access token has expired. Please refresh your token.', 401);
        return;
      }
      errorResponse(res, 'Invalid authentication token.', 401);
    }
  },
);
