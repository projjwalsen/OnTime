import { Router } from 'express';
import { healthCheck } from './controller';

const router = Router();

/**
 * @route  GET /api/v1/health
 * @desc   Health check — confirms the API is running
 * @access Public
 */
router.get('/', healthCheck);

export default router;
