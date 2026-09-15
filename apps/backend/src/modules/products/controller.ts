import type { Request, Response, RequestHandler } from 'express';
import { productsService, ProductError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type CreateProductInput,
  type UpdateProductInput,
  type ProductFilterInput,
} from './validator';

function handleProductError(res: Response, error: unknown): void {
  if (error instanceof ProductError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Products Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in product operations.', 500);
}

/**
 * @route   GET /api/v1/products
 * @desc    List products in catalog with search, filters, and pagination
 * @access  Protected
 */
export const listProducts: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query as unknown as ProductFilterInput;
      const result = await productsService.listProducts(filters);
      successResponse(res, 'Products retrieved successfully', result);
    } catch (error) {
      handleProductError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/products
 * @desc    Create product
 * @access  Protected (Distributor Admin)
 */
export const createProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as CreateProductInput;
      const product = await productsService.createProduct(dto);
      successResponse(res, 'Product created successfully', { product }, 201);
    } catch (error) {
      handleProductError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID
 * @access  Protected
 */
export const getProductById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Product ID is required', 400);
        return;
      }
      const product = await productsService.getProductById(id);
      if (!product) {
        errorResponse(res, 'Product not found', 404);
        return;
      }
      successResponse(res, 'Product retrieved successfully', { product });
    } catch (error) {
      handleProductError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/products/:id
 * @desc    Update product
 * @access  Protected (Distributor Admin)
 */
export const updateProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Product ID is required', 400);
        return;
      }
      const dto = req.body as UpdateProductInput;
      const product = await productsService.updateProduct(id, dto);
      successResponse(res, 'Product updated successfully', { product });
    } catch (error) {
      handleProductError(res, error);
    }
  },
);
