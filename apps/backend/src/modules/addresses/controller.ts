import type { Request, Response, RequestHandler } from 'express';
import { addressesService, AddressError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { type CreateAddressInput, type UpdateAddressInput } from './validator';

/**
 * @route   GET /api/v1/addresses
 * @desc    List all delivery addresses for the logged-in retailer organisation
 * @access  Protected
 */
export const listAddresses: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organisationId = req.user?.organisationId;
    if (!organisationId) {
      errorResponse(res, 'Organisation context required', 400);
      return;
    }

    const addresses = await addressesService.listAddresses(organisationId);
    successResponse(res, 'Addresses retrieved successfully', { addresses });
  },
);

/**
 * @route   POST /api/v1/addresses
 * @desc    Create a new delivery address
 * @access  Protected
 */
export const createAddress: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organisationId = req.user?.organisationId;
    if (!organisationId) {
      errorResponse(res, 'Organisation context required', 400);
      return;
    }

    const dto = req.body as CreateAddressInput;
    const address = await addressesService.createAddress(organisationId, dto);
    successResponse(res, 'Address created successfully', { address }, 201);
  },
);

/**
 * @route   GET /api/v1/addresses/:id
 * @desc    Get address details by ID
 * @access  Protected
 */
export const getAddressById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const organisationId = req.user?.organisationId || undefined;

    try {
      const address = await addressesService.getAddressById(id, organisationId);
      if (!address) {
        errorResponse(res, 'Address not found', 404);
        return;
      }
      successResponse(res, 'Address retrieved successfully', { address });
    } catch (err: unknown) {
      if (err instanceof AddressError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      throw err;
    }
  },
);

/**
 * @route   PATCH /api/v1/addresses/:id
 * @desc    Update delivery address
 * @access  Protected
 */
export const updateAddress: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const organisationId = req.user?.organisationId || null;
    const dto = req.body as UpdateAddressInput;

    try {
      const address = await addressesService.updateAddress(id, organisationId, dto);
      successResponse(res, 'Address updated successfully', { address });
    } catch (err: unknown) {
      if (err instanceof AddressError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      throw err;
    }
  },
);

/**
 * @route   PATCH /api/v1/addresses/:id/default
 * @desc    Set address as default delivery location
 * @access  Protected
 */
export const setDefaultAddress: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const organisationId = req.user?.organisationId || null;

    try {
      const address = await addressesService.setDefaultAddress(id, organisationId);
      successResponse(res, 'Default address updated successfully', { address });
    } catch (err: unknown) {
      if (err instanceof AddressError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      throw err;
    }
  },
);

/**
 * @route   DELETE /api/v1/addresses/:id
 * @desc    Delete delivery address
 * @access  Protected
 */
export const deleteAddress: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const organisationId = req.user?.organisationId || null;

    try {
      await addressesService.deleteAddress(id, organisationId);
      successResponse(res, 'Address deleted successfully', null);
    } catch (err: unknown) {
      if (err instanceof AddressError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      throw err;
    }
  },
);
