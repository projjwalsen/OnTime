import { Router } from 'express';
import { getCategories, listArticles, getArticle } from './controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { helpFilterQuerySchema } from './validator';

const router = Router();

/**
 * @route   GET /api/v1/help/categories
 * @desc    Get help categories with article counts
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   GET /api/v1/help/articles
 * @desc    Search / list help articles
 * @access  Public
 */
router.get('/articles', validateRequest({ query: helpFilterQuerySchema }), listArticles);

/**
 * @route   GET /api/v1/help/articles/:idOrSlug
 * @desc    Get article by ID or slug
 * @access  Public
 */
router.get('/articles/:idOrSlug', getArticle);

export default router;
