import type { Request, Response, RequestHandler } from 'express';
import { productsService } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type CreateProductInput, type UpdateProductInput } from './validator';

/**
 * @route   GET /api/v1/products
 * @desc    List products in catalog
 * @access  Protected
 */
export const listProducts: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const products = await productsService.listProducts();
    successResponse(res, 'Products retrieved successfully', { products });
  },
);

/**
 * @route   POST /api/v1/products
 * @desc    Create product
 * @access  Protected (Distributor Admin)
 */
export const createProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateProductInput;
    const product = await productsService.createProduct(dto);
    successResponse(res, 'Product created successfully', { product }, 201);
  },
);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID
 * @access  Protected
 */
export const getProductById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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
  },
);

/**
 * @route   PATCH /api/v1/products/:id
 * @desc    Update product
 * @access  Protected (Distributor Admin)
 */
export const updateProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) {
      errorResponse(res, 'Product ID is required', 400);
      return;
    }
    const dto = req.body as UpdateProductInput;
    const product = await productsService.updateProduct(id, dto);
    successResponse(res, 'Product updated successfully', { product });
  },
);
