import type { Request, Response, RequestHandler } from 'express';
import { helpService } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type HelpFilterQueryInput } from './validator';

/**
 * @route   GET /api/v1/help/categories
 * @desc    Get help categories with descriptions and article counts
 * @access  Public
 */
export const getCategories: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const categories = await helpService.getCategories();
    successResponse(res, 'Help categories retrieved successfully', { categories });
  },
);

/**
 * @route   GET /api/v1/help/articles
 * @desc    Search and list help articles
 * @access  Public
 */
export const listArticles: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = req.query as unknown as HelpFilterQueryInput;
    const articles = await helpService.listArticles(filters);
    successResponse(res, 'Help articles retrieved successfully', { articles });
  },
);

/**
 * @route   GET /api/v1/help/articles/:idOrSlug
 * @desc    Get help article details by ID or slug
 * @access  Public
 */
export const getArticle: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const idOrSlug = req.params.idOrSlug as string;
    const article = await helpService.getArticle(idOrSlug);
    if (!article) {
      errorResponse(res, 'Help article not found', 404);
      return;
    }
    successResponse(res, 'Help article retrieved successfully', { article });
  },
);
