import type { Request, Response, RequestHandler } from 'express';
import { settingsService } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';

/**
 * GET /api/v1/settings/tax
 * Retrieve current platform tax settings.
 */
export const getTaxSettings: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const settings = await settingsService.getTaxSettings();
      successResponse(res, 'Tax settings retrieved successfully', settings);
    } catch (err: any) {
      errorResponse(res, err.message || 'Failed to retrieve tax settings', 500);
    }
  },
);

/**
 * PUT /api/v1/settings/tax
 * Update platform tax configuration (Super Admin only).
 */
export const updateTaxSettings: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await settingsService.updateTaxSettings(req.body);
      successResponse(res, 'Tax settings updated successfully', updated);
    } catch (err: any) {
      errorResponse(res, err.message || 'Failed to update tax settings', 400);
    }
  },
);
