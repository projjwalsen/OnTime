import type { Request, Response, RequestHandler } from 'express';
import { organisationsService } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type CreateOrganisationInput, type UpdateOrganisationInput } from './validator';

/**
 * @route   GET /api/v1/organisations
 * @desc    List all organisations (Distributor Admin)
 * @access  Protected (Distributor Admin)
 */
export const listOrganisations: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const organisations = await organisationsService.listOrganisations();
    successResponse(res, 'Organisations retrieved successfully', { organisations });
  },
);

/**
 * @route   POST /api/v1/organisations
 * @desc    Create / Onboard a new retailer organisation
 * @access  Protected (Distributor Admin)
 */
export const createOrganisation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateOrganisationInput;
    const organisation = await organisationsService.createOrganisation(dto);
    successResponse(res, 'Organisation created successfully', { organisation }, 201);
  },
);

/**
 * @route   GET /api/v1/organisations/:id
 * @desc    Get organisation details by ID
 * @access  Protected (Distributor Admin or Org Member)
 */
export const getOrganisationById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) {
      errorResponse(res, 'Organisation ID is required', 400);
      return;
    }
    if (req.user?.organisationId && req.user.organisationId !== id) {
      errorResponse(res, 'Forbidden: Cannot access another organisation', 403);
      return;
    }
    const organisation = await organisationsService.getOrganisationById(id);
    if (!organisation) {
      errorResponse(res, 'Organisation not found', 404);
      return;
    }
    successResponse(res, 'Organisation retrieved successfully', { organisation });
  },
);

/**
 * @route   PATCH /api/v1/organisations/:id
 * @desc    Update organisation details
 * @access  Protected (Distributor Admin or Org Admin)
 */
export const updateOrganisation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) {
      errorResponse(res, 'Organisation ID is required', 400);
      return;
    }
    if (req.user?.organisationId && req.user.organisationId !== id) {
      errorResponse(res, 'Forbidden: Cannot update another organisation', 403);
      return;
    }
    const dto = req.body as UpdateOrganisationInput;
    const organisation = await organisationsService.updateOrganisation(id, dto);
    successResponse(res, 'Organisation updated successfully', { organisation });
  },
);
