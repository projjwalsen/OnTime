import { Router } from 'express';
import { healthCheck } from '../../controllers/health.controller';

const router = Router();

/**
 * @route  GET /api/v1/health
 * @desc   Health check — confirms the API is running
 * @access Public
 */
router.get('/health', healthCheck);

export default router;
