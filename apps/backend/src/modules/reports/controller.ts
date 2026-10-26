import type { Request, Response, RequestHandler } from 'express';
import { reportsService, ReportError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';

function handleReportError(res: Response, error: unknown): void {
  if (error instanceof ReportError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Reports Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred while generating reports.', 500);
}

/**
 * @route   GET /api/v1/reports/purchase-history/overall/:organisationId
 * @desc    Get overall customer purchase history
 * @access  Protected
 */
export const getCustomerOverallPurchaseHistory: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caller = (req as any).user;
      const organisationId = req.params.organisationId as string;
      const data = await reportsService.getCustomerOverallPurchaseHistory(organisationId, caller);
      successResponse(res, 'Overall purchase history retrieved successfully', data);
    } catch (error) {
      handleReportError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/reports/purchase-history/product-wise/:organisationId
 * @desc    Get product-wise customer purchase history
 * @access  Protected
 */
export const getCustomerProductPurchaseHistory: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caller = (req as any).user;
      const organisationId = req.params.organisationId as string;
      const data = await reportsService.getCustomerProductPurchaseHistory(organisationId, caller);
      successResponse(res, 'Product-wise purchase history retrieved successfully', data);
    } catch (error) {
      handleReportError(res, error);
    }
  },
);
