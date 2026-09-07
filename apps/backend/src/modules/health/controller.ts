import type { Request, Response } from 'express';
import { successResponse } from '../../utils/response';

/**
 * GET /api/v1/health
 *
 * Health check endpoint.
 * Returns a success response confirming the API is operational.
 * Publicly accessible.
 */
export function healthCheck(_req: Request, res: Response): void {
  successResponse(res, 'API is running');
}
