import type { Request, Response, RequestHandler } from 'express';
import { draftOrdersService, DraftOrderError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type CreateDraftOrderInput,
  type UpdateDraftOrderInput,
  type AddDraftOrderItemInput,
  type UpdateDraftOrderItemInput,
  type BulkRemoveDraftOrderItemsInput,
  type ConvertDraftOrderInput,
  type DraftOrderFilterInput,
} from './validator';

function handleDraftOrderError(res: Response, error: unknown): void {
  if (
    error instanceof DraftOrderError ||
    (error as any)?.name === 'DraftOrderError' ||
    ((error as any)?.statusCode && typeof (error as any).statusCode === 'number' && (error as any).statusCode < 500)
  ) {
    const statusCode = (error as any).statusCode || 400;
    const message = (error as any).message || 'Draft order operation failed';
    errorResponse(res, message, statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Draft Orders Controller Error]', err.message, err.stack);
  errorResponse(res, err.message || 'An unexpected error occurred in draft order operations.', 500);
}

/**
 * @route   POST /api/v1/draft-orders
 * @desc    Create a new draft order (Retailer Admin / Staff only)
 * @access  Protected
 */
export const createDraftOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as CreateDraftOrderInput;
      const draftOrder = await draftOrdersService.createDraftOrder(req.user!, dto);
      successResponse(res, 'Draft order created successfully', { draftOrder }, 201);
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/draft-orders
 * @desc    List draft orders belonging to the caller's organisation
 * @access  Protected
 */
export const listDraftOrders: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query as unknown as DraftOrderFilterInput;
      const result = await draftOrdersService.listDraftOrders(req.user!, filters);
      successResponse(res, 'Draft orders retrieved successfully', result);
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/draft-orders/:id
 * @desc    Get details of a single draft order
 * @access  Protected
 */
export const getDraftOrderById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Draft order ID is required', 400);
        return;
      }
      const draftOrder = await draftOrdersService.getDraftOrderById(req.user!, id);
      successResponse(res, 'Draft order retrieved successfully', { draftOrder });
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/draft-orders/:id or PUT /api/v1/draft-orders/:id
 * @desc    Update draft order details or replace all items
 * @access  Protected
 */
export const updateDraftOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Draft order ID is required', 400);
        return;
      }
      const dto = req.body as UpdateDraftOrderInput;
      const draftOrder = await draftOrdersService.updateDraftOrder(req.user!, id, dto);
      successResponse(res, 'Draft order updated successfully', { draftOrder });
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/draft-orders/:id/items
 * @desc    Add an item to a draft order (or increment quantity if already exists)
 * @access  Protected
 */
export const addItemToDraft: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Draft order ID is required', 400);
        return;
      }
      const dto = req.body as AddDraftOrderItemInput;
      const draftOrder = await draftOrdersService.addItemToDraft(req.user!, id, dto);
      successResponse(res, 'Item added to draft order successfully', { draftOrder });
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/draft-orders/:id/items/:itemId
 * @desc    Update quantity or variant of an item in a draft order
 * @access  Protected
 */
export const updateDraftItem: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;
      if (!id || !itemId) {
        errorResponse(res, 'Draft order ID and item ID are required', 400);
        return;
      }
      const dto = req.body as UpdateDraftOrderItemInput;
      const draftOrder = await draftOrdersService.updateDraftItem(req.user!, id, itemId, dto);
      successResponse(res, 'Draft order item updated successfully', { draftOrder });
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/draft-orders/:id/items/:itemId
 * @desc    Remove an item line from a draft order
 * @access  Protected
 */
export const removeItemFromDraft: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;
      if (!id || !itemId) {
        errorResponse(res, 'Draft order ID and item ID are required', 400);
        return;
      }
      const draftOrder = await draftOrdersService.removeItemFromDraft(req.user!, id, itemId);
      successResponse(res, 'Item removed from draft order successfully', { draftOrder });
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/draft-orders/:id/items or POST /api/v1/draft-orders/:id/items/bulk-remove
 * @desc    Bulk remove line items from a draft order
 * @access  Protected
 */
export const bulkRemoveItemsFromDraft: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Draft order ID is required', 400);
        return;
      }
      const dto = req.body as BulkRemoveDraftOrderItemsInput;
      const draftOrder = await draftOrdersService.bulkRemoveItemsFromDraft(
        req.user!,
        id,
        dto.itemIds,
      );
      successResponse(res, 'Items removed from draft order successfully', { draftOrder });
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);


/**
 * @route   DELETE /api/v1/draft-orders/:id
 * @desc    Discard / delete a draft order
 * @access  Protected
 */
export const deleteDraftOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Draft order ID is required', 400);
        return;
      }
      await draftOrdersService.deleteDraftOrder(req.user!, id);
      successResponse(res, 'Draft order discarded successfully', null);
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/draft-orders/:id/convert
 * @desc    Convert draft order into an official wholesale Order
 * @access  Protected
 */
export const convertDraftOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Draft order ID is required', 400);
        return;
      }
      const overrides = req.body as ConvertDraftOrderInput;
      const order = await draftOrdersService.convertDraftToOrder(req.user!, id, overrides);
      successResponse(
        res,
        'Draft order converted to official wholesale order successfully',
        { order },
        201,
      );
    } catch (error) {
      handleDraftOrderError(res, error);
    }
  },
);
