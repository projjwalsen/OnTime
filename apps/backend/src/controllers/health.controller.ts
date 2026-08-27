import type { Request, Response } from 'express';
import { successResponse } from '../utils/response';

/**
 * GET /api/v1/health
 *
 * Simple health check endpoint.
 * Returns a success response confirming the API is running.
 * This endpoint is intentionally unauthenticated and always publicly accessible.
 */
export function healthCheck(_req: Request, res: Response): void {
  successResponse(res, 'API is running');
}
