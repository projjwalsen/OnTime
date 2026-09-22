import type { Request, Response, RequestHandler } from 'express';
import { supportService, SupportError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type CreateSupportTicketInput } from './validator';

/**
 * @route   GET /api/v1/support/topics
 * @desc    Get available support topics
 * @access  Public / Protected
 */
export const getTopics: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const topics = supportService.getTopics();
    successResponse(res, 'Support topics retrieved successfully', { topics });
  },
);

/**
 * @route   POST /api/v1/support/tickets
 * @desc    Submit a support ticket
 * @access  Protected
 */
export const createTicket: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const dto = req.body as CreateSupportTicketInput;
    try {
      const ticket = await supportService.createTicket(req.user, dto);
      successResponse(res, 'Support request submitted successfully', { ticket }, 201);
    } catch (err: unknown) {
      if (err instanceof SupportError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      throw err;
    }
  },
);

/**
 * @route   GET /api/v1/support/tickets
 * @desc    List support tickets
 * @access  Protected
 */
export const listTickets: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const tickets = await supportService.listTickets(req.user);
    successResponse(res, 'Support tickets retrieved successfully', { tickets });
  },
);

/**
 * @route   GET /api/v1/support/tickets/:id
 * @desc    Get support ticket details by ID
 * @access  Protected
 */
export const getTicketById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const id = req.params.id as string;
    try {
      const ticket = await supportService.getTicketById(id, req.user);
      if (!ticket) {
        errorResponse(res, 'Support ticket not found', 404);
        return;
      }
      successResponse(res, 'Support ticket retrieved successfully', { ticket });
    } catch (err: unknown) {
      if (err instanceof SupportError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      throw err;
    }
  },
);
