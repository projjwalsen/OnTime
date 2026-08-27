import { Router } from 'express';
import v1Router from './v1/index';

const router = Router();

/**
 * API versioning.
 * All routes are prefixed with /api/v1
 *
 * Future versions can be added here:
 *   router.use('/v2', v2Router);
 */
router.use('/v1', v1Router);

export default router;
