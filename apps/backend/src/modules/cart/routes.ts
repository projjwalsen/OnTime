import { Router } from 'express';
import {
  getCartPreview,
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  updateCart,
  applyCoupon,
  removeCoupon,
  checkoutCart,
  saveDraftCart,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import {
  cartPreviewSchema,
  addCartItemSchema,
  updateCartItemSchema,
  updateCartSchema,
  applyCouponSchema,
  cartCheckoutSchema,
  cartSaveDraftSchema,
} from './validator';

const router = Router();

// All cart endpoints require an authenticated user
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cart/preview & POST /api/v1/cart/calculate
 * @desc    Clear calculation & preview of taxes, discounts, delivery, and other charges
 * @access  Protected (All authenticated users: Retailer Admin, Staff, Super Admin)
 */
router.post('/preview', validateBody(cartPreviewSchema), getCartPreview);
router.post('/calculate', validateBody(cartPreviewSchema), getCartPreview);

/**
 * @route   GET /api/v1/cart
 * @desc    Get active persistent cart with real-time calculations
 * @access  Protected
 */
router.get('/', getCart);

/**
 * @route   POST /api/v1/cart & POST /api/v1/cart/items
 * @desc    Add item or increment quantity in persistent cart
 * @access  Protected
 */
router.post('/', validateBody(addCartItemSchema), addItemToCart);
router.post('/items', validateBody(addCartItemSchema), addItemToCart);

/**
 * @route   PATCH /api/v1/cart/items/:id
 * @desc    Update quantity of line item in cart
 * @access  Protected
 */
router.patch('/items/:id', validateBody(updateCartItemSchema), updateCartItem);

/**
 * @route   DELETE /api/v1/cart/items/:id
 * @desc    Remove line item from cart
 * @access  Protected
 */
router.delete('/items/:id', removeCartItem);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear all items in cart
 * @access  Protected
 */
router.delete('/', clearCart);

/**
 * @route   PATCH /api/v1/cart
 * @desc    Update cart notes, delivery address, custom charges
 * @access  Protected
 */
router.patch('/', validateBody(updateCartSchema), updateCart);

/**
 * @route   POST /api/v1/cart/coupon & POST /api/v1/cart/apply-coupon
 * @desc    Apply coupon to active cart
 * @access  Protected
 */
router.post('/coupon', validateBody(applyCouponSchema), applyCoupon);
router.post('/apply-coupon', validateBody(applyCouponSchema), applyCoupon);

/**
 * @route   DELETE /api/v1/cart/coupon & DELETE /api/v1/cart/remove-coupon
 * @desc    Remove applied coupon from active cart
 * @access  Protected
 */
router.delete('/coupon', removeCoupon);
router.delete('/remove-coupon', removeCoupon);

/**
 * @route   POST /api/v1/cart/checkout
 * @desc    Convert active cart to a placed order and clear cart
 * @access  Protected
 */
router.post('/checkout', validateBody(cartCheckoutSchema), checkoutCart);

/**
 * @route   POST /api/v1/cart/save-draft
 * @desc    Save active cart as a draft order
 * @access  Protected
 */
router.post('/save-draft', validateBody(cartSaveDraftSchema), saveDraftCart);

export default router;
