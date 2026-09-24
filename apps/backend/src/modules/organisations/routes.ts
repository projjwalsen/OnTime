import { Router } from 'express';
import {
  listOrganisations,
  createOrganisation,
  getOrganisationById,
  updateOrganisation,
  getBusinessDetails,
  updateBusinessDetails,
  updateOrganisationStatus,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  requireDistributorAdmin,
  requireOrganisationAdmin,
  requireSuperAdmin,
} from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  createOrganisationSchema,
  updateOrganisationSchema,
  updateBusinessDetailsSchema,
  updateOrganisationStatusSchema,
  organisationFilterQuerySchema,
} from './validator';

const router = Router();

// All organisation routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/organisations/business-details
 * @desc    Get business details of the retailer organisation
 * @access  Protected (Retailer Admin, Retailer Staff, or Super Admin)
 */
router.get('/business-details', getBusinessDetails);

/**
 * @route   PATCH /api/v1/organisations/business-details
 * @desc    Update business details (contact person, business name, tax ID, email, mobile, address)
 * @access  Protected (Retailer Admin or Super Admin only; Retailer Staff forbidden)
 */
router.patch(
  '/business-details',
  requireOrganisationAdmin,
  validateBody(updateBusinessDetailsSchema),
  updateBusinessDetails,
);

/**
 * @route   GET /api/v1/organisations/my
 * @desc    Alias for /business-details
 * @access  Protected (Retailer Admin, Retailer Staff, or Super Admin)
 */
router.get('/my', getBusinessDetails);

/**
 * @route   PATCH /api/v1/organisations/my
 * @desc    Alias for /business-details
 * @access  Protected (Retailer Admin or Super Admin only)
 */
router.patch(
  '/my',
  requireOrganisationAdmin,
  validateBody(updateBusinessDetailsSchema),
  updateBusinessDetails,
);

/**
 * @route   GET /api/v1/organisations
 * @desc    List all organisations with search, filters, and pagination
 * @access  Protected (Super Admin / Distributor Admin)
 */
router.get(
  '/',
  requireDistributorAdmin,
  validateRequest({ query: organisationFilterQuerySchema }),
  listOrganisations,
);

/**
 * @route   POST /api/v1/organisations
 * @desc    Create / Onboard a new retailer organisation
 * @access  Protected (Super Admin / Distributor Admin)
 */
router.post(
  '/',
  requireDistributorAdmin,
  validateBody(createOrganisationSchema),
  createOrganisation,
);

/**
 * @route   PATCH /api/v1/organisations/:id/status
 * @desc    Update organisation operational status (ACTIVE, SUSPENDED, INACTIVE)
 * @access  Protected (Super Admin only)
 */
router.patch(
  '/:id/status',
  requireSuperAdmin,
  validateBody(updateOrganisationStatusSchema),
  updateOrganisationStatus,
);

/**
 * @route   GET /api/v1/organisations/:id
 * @desc    Get organisation details by ID
 * @access  Protected (Super Admin or Org Member)
 */
router.get('/:id', getOrganisationById);

/**
 * @route   PATCH /api/v1/organisations/:id
 * @desc    Update organisation details
 * @access  Protected (Super Admin or Org Admin)
 */
router.patch(
  '/:id',
  requireOrganisationAdmin,
  validateBody(updateOrganisationSchema),
  updateOrganisation,
);

export default router;
