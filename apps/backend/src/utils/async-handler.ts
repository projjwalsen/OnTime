import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler / middleware to satisfy ESLint's
 * no-misused-promises rule and cleanly forward uncaught errors to next().
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
