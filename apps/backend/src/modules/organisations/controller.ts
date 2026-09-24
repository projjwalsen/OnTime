import type { Request, Response, RequestHandler } from 'express';
import { organisationsService, OrganisationError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type CreateOrganisationInput,
  type UpdateOrganisationInput,
  type UpdateBusinessDetailsInput,
  type OrganisationFilterInput,
} from './validator';

function handleOrganisationError(res: Response, error: unknown): void {
  if (error instanceof OrganisationError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Organisation Controller Error]', err.message, err.stack);
  errorResponse(res, 'An unexpected error occurred in organisation operations.', 500);
}

/**
 * @route   GET /api/v1/organisations/business-details
 * @desc    Get business details of current retailer organisation (or specified org for Super Admin)
 * @access  Protected (Super Admin, Retailer Admin, Retailer Staff)
 */
export const getBusinessDetails: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const targetOrgId = (req.query.organisationId as string) || undefined;
      const businessDetails = await organisationsService.getBusinessDetails(req.user, targetOrgId);
      successResponse(res, 'Business details retrieved successfully', { businessDetails });
    } catch (error) {
      handleOrganisationError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/organisations/business-details
 * @desc    Update business details (contact person, business name, tax ID, email, phone, address)
 * @access  Protected (Retailer Admin or Super Admin only)
 */
export const updateBusinessDetails: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const targetOrgId = (req.query.organisationId as string) || undefined;
      const dto = req.body as UpdateBusinessDetailsInput;
      const businessDetails = await organisationsService.updateBusinessDetails(
        req.user,
        dto,
        targetOrgId,
      );
      successResponse(res, 'Business details updated successfully', { businessDetails });
    } catch (error) {
      handleOrganisationError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/organisations
 * @desc    List all organisations (Super Admin) with search, filter, and pagination
 * @access  Protected (Super Admin)
 */
export const listOrganisations: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = req.query as unknown as OrganisationFilterInput;
    const result = await organisationsService.listOrganisations(filters);
    successResponse(res, 'Organisations retrieved successfully', result);
  },
);

/**
 * @route   POST /api/v1/organisations
 * @desc    Create / Onboard a new retailer organisation
 * @access  Protected (Super Admin)
 */
export const createOrganisation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = req.body as CreateOrganisationInput;
      const organisation = await organisationsService.createOrganisation(dto);
      successResponse(res, 'Organisation created successfully', { organisation }, 201);
    } catch (error) {
      handleOrganisationError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/organisations/:id
 * @desc    Get organisation details by ID
 * @access  Protected (Super Admin or Org Member)
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
 * @access  Protected (Super Admin or Org Admin)
 */
export const updateOrganisation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Organisation ID is required', 400);
        return;
      }
      const dto = req.body as UpdateOrganisationInput;
      const organisation = await organisationsService.updateOrganisation(req.user, id, dto);
      successResponse(res, 'Organisation updated successfully', { organisation });
    } catch (error) {
      handleOrganisationError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/organisations/:id/status
 * @desc    Update organisation operational status (ACTIVE, SUSPENDED, INACTIVE)
 * @access  Protected (Super Admin only)
 */
export const updateOrganisationStatus: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Unauthorised', 401);
        return;
      }
      const id = req.params.id as string;
      if (!id) {
        errorResponse(res, 'Organisation ID is required', 400);
        return;
      }
      const { status } = req.body;
      const organisation = await organisationsService.updateOrganisationStatus(req.user, id, status);
      successResponse(res, `Organisation status updated to ${status}`, { organisation });
    } catch (error) {
      handleOrganisationError(res, error);
    }
  },
);
