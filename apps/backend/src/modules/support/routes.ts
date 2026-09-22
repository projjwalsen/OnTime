import { Router } from 'express';
import { getTopics, createTicket, listTickets, getTicketById } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createSupportTicketSchema } from './validator';

const router = Router();

/**
 * @route   GET /api/v1/support/topics
 * @desc    Get support topics
 * @access  Public / Open
 */
router.get('/topics', getTopics);

// All ticket operations require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/v1/support/tickets
 * @desc    Submit a support ticket
 * @access  Protected
 */
router.post('/tickets', validateBody(createSupportTicketSchema), createTicket);

/**
 * @route   GET /api/v1/support/tickets
 * @desc    List support tickets
 * @access  Protected
 */
router.get('/tickets', listTickets);

/**
 * @route   GET /api/v1/support/tickets/:id
 * @desc    Get support ticket details
 * @access  Protected
 */
router.get('/tickets/:id', getTicketById);

export default router;
