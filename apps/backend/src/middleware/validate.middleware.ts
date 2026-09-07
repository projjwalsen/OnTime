import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { type ZodType, ZodError } from 'zod';
import { errorResponse } from '../utils/response';
import { asyncHandler } from '../utils/async-handler';

/**
 * Higher-order middleware to validate incoming request data using Zod.
 * Supports validating body, query, and params.
 */
export function validateRequest(schema: {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}): RequestHandler {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Request['query'];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        errorResponse(res, 'Validation failed', 400, formattedErrors);
        return;
      }
      errorResponse(res, 'Invalid request payload', 400);
    }
  });
}

/**
 * Shorthand for validating only request body.
 */
export function validateBody(schema: ZodType): RequestHandler {
  return validateRequest({ body: schema });
}
