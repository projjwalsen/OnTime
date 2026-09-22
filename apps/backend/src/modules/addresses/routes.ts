import { Router } from 'express';
import {
  listAddresses,
  createAddress,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createAddressSchema, updateAddressSchema } from './validator';

const router = Router();

// All address routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/addresses
 * @desc    List all delivery addresses for the organisation
 * @access  Protected
 */
router.get('/', listAddresses);

/**
 * @route   POST /api/v1/addresses
 * @desc    Create a new delivery address
 * @access  Protected
 */
router.post('/', validateBody(createAddressSchema), createAddress);

/**
 * @route   GET /api/v1/addresses/:id
 * @desc    Get address by ID
 * @access  Protected
 */
router.get('/:id', getAddressById);

/**
 * @route   PATCH /api/v1/addresses/:id
 * @desc    Update delivery address
 * @access  Protected
 */
router.patch('/:id', validateBody(updateAddressSchema), updateAddress);

/**
 * @route   PATCH /api/v1/addresses/:id/default
 * @desc    Set address as default delivery location
 * @access  Protected
 */
router.patch('/:id/default', setDefaultAddress);

/**
 * @route   DELETE /api/v1/addresses/:id
 * @desc    Delete delivery address
 * @access  Protected
 */
router.delete('/:id', deleteAddress);

export default router;
