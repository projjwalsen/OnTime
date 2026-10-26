import type { Request, Response, RequestHandler } from 'express';
import { couponsService, CouponError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { createCouponSchema, updateCouponSchema, validateCouponSchema } from './validator';

function handleCouponError(res: Response, error: unknown): void {
  if (error instanceof CouponError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Coupons Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in coupon operations.', 500);
}

/**
 * @route   GET /api/v1/coupons
 * @desc    List all coupons with search, filters, pagination
 * @access  Protected (Super Admin / Admin)
 */
export const listCoupons: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = req.query.search as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const organisationId = req.query.organisationId as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await couponsService.listCoupons({
        page,
        limit,
        search,
        isActive,
        organisationId,
        userId,
      });

      successResponse(res, 'Coupons retrieved successfully', result);
    } catch (error) {
      handleCouponError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/coupons/:id
 * @desc    Get coupon by ID
 * @access  Protected
 */
export const getCouponById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const coupon = await couponsService.getCouponById(req.params.id as string);
      successResponse(res, 'Coupon retrieved successfully', { coupon });
    } catch (error) {
      handleCouponError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/coupons
 * @desc    Create new coupon and optionally email recipient
 * @access  Protected (Super Admin / Admin)
 */
export const createCoupon: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = createCouponSchema.parse(req.body);
      const coupon = await couponsService.createCoupon(validated);
      successResponse(res, 'Coupon created successfully', { coupon }, 201);
    } catch (error: any) {
      if (error?.errors) {
        errorResponse(res, error.errors[0]?.message || 'Invalid coupon data', 400);
        return;
      }
      handleCouponError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/coupons/:id
 * @desc    Update coupon details
 * @access  Protected (Super Admin / Admin)
 */
export const updateCoupon: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = updateCouponSchema.parse(req.body);
      const coupon = await couponsService.updateCoupon(req.params.id as string, validated);
      successResponse(res, 'Coupon updated successfully', { coupon });
    } catch (error: any) {
      if (error?.errors) {
        errorResponse(res, error.errors[0]?.message || 'Invalid coupon update data', 400);
        return;
      }
      handleCouponError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/coupons/:id
 * @desc    Delete coupon
 * @access  Protected (Super Admin / Admin)
 */
export const deleteCoupon: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      await couponsService.deleteCoupon(req.params.id as string);
      successResponse(res, 'Coupon deleted successfully');
    } catch (error) {
      handleCouponError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/coupons/validate
 * @desc    Validate coupon code and compute discount for order
 * @access  Protected
 */
export const validateCoupon: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = validateCouponSchema.parse(req.body);
      const caller = (req as any).user;
      const result = await couponsService.validateCoupon(
        validated.code,
        validated.orderAmount,
        caller,
      );
      successResponse(res, result.message || 'Coupon applied successfully', result);
    } catch (error: any) {
      if (error?.errors) {
        errorResponse(res, error.errors[0]?.message || 'Invalid input', 400);
        return;
      }
      handleCouponError(res, error);
    }
  },
);
