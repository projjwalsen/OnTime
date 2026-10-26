import type { Request, Response, RequestHandler } from 'express';
import { bannersService, BannerError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { createBannerSchema, updateBannerSchema } from './validator';

function handleBannerError(res: Response, error: unknown): void {
  if (error instanceof BannerError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Banners Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in banner operations.', 500);
}

/**
 * @route   GET /api/v1/banners
 * @desc    List banners (all for admins, or active-only for public/customers)
 * @access  Public / Protected
 */
export const listBanners: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const banners = await bannersService.listBanners(activeOnly);
      successResponse(res, 'Banners retrieved successfully', { banners });
    } catch (error) {
      handleBannerError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/banners/:id
 * @desc    Get banner by ID
 * @access  Protected
 */
export const getBannerById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const banner = await bannersService.getBannerById(req.params.id as string);
      successResponse(res, 'Banner retrieved successfully', { banner });
    } catch (error) {
      handleBannerError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/banners
 * @desc    Create banner
 * @access  Protected (Super Admin / Admin)
 */
export const createBanner: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = createBannerSchema.parse(req.body);
      const banner = await bannersService.createBanner(validated as any);
      successResponse(res, 'Banner created successfully', { banner }, 201);
    } catch (error: any) {
      if (error?.errors) {
        errorResponse(res, error.errors[0]?.message || 'Invalid banner data', 400);
        return;
      }
      handleBannerError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/banners/:id
 * @desc    Update banner
 * @access  Protected (Super Admin / Admin)
 */
export const updateBanner: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = updateBannerSchema.parse(req.body);
      const banner = await bannersService.updateBanner(req.params.id as string, validated as any);
      successResponse(res, 'Banner updated successfully', { banner });
    } catch (error: any) {
      if (error?.errors) {
        errorResponse(res, error.errors[0]?.message || 'Invalid banner update data', 400);
        return;
      }
      handleBannerError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/banners/:id
 * @desc    Delete banner
 * @access  Protected (Super Admin / Admin)
 */
export const deleteBanner: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      await bannersService.deleteBanner(req.params.id as string);
      successResponse(res, 'Banner deleted successfully');
    } catch (error) {
      handleBannerError(res, error);
    }
  },
);

/**
 * @route   PUT /api/v1/banners/reorder
 * @desc    Reorder banners by IDs
 * @access  Protected (Super Admin / Admin)
 */
export const reorderBanners: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        errorResponse(res, 'Array of IDs is required for reordering', 400);
        return;
      }
      await bannersService.reorderBanners(ids);
      successResponse(res, 'Banners reordered successfully');
    } catch (error) {
      handleBannerError(res, error);
    }
  },
);
