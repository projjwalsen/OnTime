import { Router } from 'express';
import {
  listOrganisations,
  createOrganisation,
  getOrganisationById,
  updateOrganisation,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  requireDistributorAdmin,
  requireOrganisationAdmin,
} from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  createOrganisationSchema,
  updateOrganisationSchema,
  organisationFilterQuerySchema,
} from './validator';

const router = Router();

router.use(authMiddleware);

/**
 * @route   GET /api/v1/organisations
 * @desc    List all organisations with search, filters, and pagination
 * @access  Protected (Distributor Admin)
 */
router.get(
  '/',
  requireDistributorAdmin,
  validateRequest({ query: organisationFilterQuerySchema }),
  listOrganisations,
);

/**
 * @route   POST /api/v1/organisations
 * @desc    Create a new retailer organisation
 * @access  Protected (Distributor Admin)
 */
router.post(
  '/',
  requireDistributorAdmin,
  validateBody(createOrganisationSchema),
  createOrganisation,
);

/**
 * @route   GET /api/v1/organisations/:id
 * @desc    Get organisation details
 * @access  Protected (Distributor Admin or Org Member)
 */
router.get('/:id', getOrganisationById);

/**
 * @route   PATCH /api/v1/organisations/:id
 * @desc    Update organisation details
 * @access  Protected (Distributor Admin or Org Admin)
 */
router.patch(
  '/:id',
  requireOrganisationAdmin,
  validateBody(updateOrganisationSchema),
  updateOrganisation,
);

export default router;
