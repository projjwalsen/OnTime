import type { Request, Response, RequestHandler } from 'express';
import { categoriesService, CategoryError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CategoryFilterInput,
} from './validator';

function handleCategoryError(res: Response, error: unknown): void {
  if (error instanceof CategoryError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Categories Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in category operations.', 500);
}

/**
 * @route   GET /api/v1/categories
 * @desc    List all categories with product counts, search, and pagination
 * @access  Protected
 */
export const listCategories: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query as unknown as CategoryFilterInput;
      const result = await categoriesService.listCategories(filters);
      successResponse(res, 'Categories retrieved successfully', result);
    } catch (error) {
      handleCategoryError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/categories
 * @desc    Create category
 * @access  Protected (Distributor Admin)
 */
export const createCategory: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as CreateCategoryInput;
      const category = await categoriesService.createCategory(dto);
      successResponse(res, 'Category created successfully', { category }, 201);
    } catch (error) {
      handleCategoryError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID with its products
 * @access  Protected
 */
export const getCategoryById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Category ID is required', 400);
        return;
      }
      const category = await categoriesService.getCategoryById(id);
      if (!category) {
        errorResponse(res, 'Category not found', 404);
        return;
      }
      successResponse(res, 'Category retrieved successfully', { category });
    } catch (error) {
      handleCategoryError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/categories/:id
 * @desc    Update category
 * @access  Protected (Distributor Admin)
 */
export const updateCategory: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Category ID is required', 400);
        return;
      }
      const dto = req.body as UpdateCategoryInput;
      const category = await categoriesService.updateCategory(id, dto);
      successResponse(res, 'Category updated successfully', { category });
    } catch (error) {
      handleCategoryError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category
 * @access  Protected (Distributor Admin)
 */
export const deleteCategory: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Category ID is required', 400);
        return;
      }
      await categoriesService.deleteCategory(id);
      successResponse(res, 'Category deleted successfully');
    } catch (error) {
      handleCategoryError(res, error);
    }
  },
);
