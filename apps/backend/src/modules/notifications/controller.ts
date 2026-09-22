import type { Request, Response, RequestHandler } from 'express';
import { notificationsService } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type UpdateNotificationPreferencesInput } from './validator';

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get logged-in user's notification preferences
 * @access  Protected
 */
export const getPreferences: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const preferences = await notificationsService.getPreferences(userId);
    successResponse(res, 'Notification preferences retrieved successfully', { preferences });
  },
);

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update logged-in user's notification preferences
 * @access  Protected
 */
export const updatePreferences: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const dto = req.body as UpdateNotificationPreferencesInput;
    const preferences = await notificationsService.updatePreferences(userId, dto);
    successResponse(res, 'Notification preferences updated successfully', { preferences });
  },
);
