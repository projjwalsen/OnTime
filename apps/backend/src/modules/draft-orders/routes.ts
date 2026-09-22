import { Router } from 'express';
import {
  createDraftOrder,
  listDraftOrders,
  getDraftOrderById,
  updateDraftOrder,
  addItemToDraft,
  updateDraftItem,
  removeItemFromDraft,
  bulkRemoveItemsFromDraft,
  deleteDraftOrder,
  convertDraftOrder,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireOrganisationUser } from '../../middleware/rbac.middleware';
import { validateBody, validateRequest } from '../../middleware/validate.middleware';
import {
  createDraftOrderSchema,
  updateDraftOrderSchema,
  addDraftOrderItemSchema,
  updateDraftOrderItemSchema,
  bulkRemoveDraftOrderItemsSchema,
  convertDraftOrderSchema,
  draftOrderFilterQuerySchema,
} from './validator';

const router = Router();

// All draft order routes require authentication AND retailer organisation membership (ADMIN or STAFF only; SUPER_ADMIN is strictly blocked)
router.use(authMiddleware);
router.use(requireOrganisationUser);

/**
 * @route   POST /api/v1/draft-orders
 * @desc    Create a new draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.post('/', validateBody(createDraftOrderSchema), createDraftOrder);

/**
 * @route   GET /api/v1/draft-orders
 * @desc    List draft orders belonging to the retailer organisation
 * @access  Protected (Retailer Admin / Staff only)
 */
router.get('/', validateRequest({ query: draftOrderFilterQuerySchema }), listDraftOrders);

/**
 * @route   GET /api/v1/draft-orders/:id
 * @desc    Get details of a single draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.get('/:id', getDraftOrderById);

/**
 * @route   PATCH /api/v1/draft-orders/:id or PUT /api/v1/draft-orders/:id
 * @desc    Update draft order details or replace line items
 * @access  Protected (Retailer Admin / Staff only)
 */
router.patch('/:id', validateBody(updateDraftOrderSchema), updateDraftOrder);
router.put('/:id', validateBody(updateDraftOrderSchema), updateDraftOrder);

/**
 * @route   DELETE /api/v1/draft-orders/:id
 * @desc    Discard / delete a draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.delete('/:id', deleteDraftOrder);

/**
 * @route   POST /api/v1/draft-orders/:id/items
 * @desc    Add an item or increment quantity in a draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.post('/:id/items', validateBody(addDraftOrderItemSchema), addItemToDraft);

/**
 * @route   DELETE /api/v1/draft-orders/:id/items
 * @desc    Bulk remove line items from a draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.delete('/:id/items', validateBody(bulkRemoveDraftOrderItemsSchema), bulkRemoveItemsFromDraft);

/**
 * @route   POST /api/v1/draft-orders/:id/items/bulk-remove
 * @desc    Bulk remove line items from a draft order (POST alias for clients with DELETE body restrictions)
 * @access  Protected (Retailer Admin / Staff only)
 */
router.post(
  '/:id/items/bulk-remove',
  validateBody(bulkRemoveDraftOrderItemsSchema),
  bulkRemoveItemsFromDraft,
);

/**
 * @route   PATCH /api/v1/draft-orders/:id/items/:itemId
 * @desc    Update quantity or variant of an item in a draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.patch('/:id/items/:itemId', validateBody(updateDraftOrderItemSchema), updateDraftItem);

/**
 * @route   DELETE /api/v1/draft-orders/:id/items/:itemId
 * @desc    Remove an item line from a draft order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.delete('/:id/items/:itemId', removeItemFromDraft);


/**
 * @route   POST /api/v1/draft-orders/:id/convert
 * @desc    Convert draft order into an official wholesale Order
 * @access  Protected (Retailer Admin / Staff only)
 */
router.post('/:id/convert', validateBody(convertDraftOrderSchema), convertDraftOrder);

export default router;
