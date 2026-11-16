import type { Request, Response, RequestHandler } from 'express';
import { cartService, CartError } from './service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import {
  type CartPreviewInput,
  type AddCartItemInput,
  type UpdateCartItemInput,
  type UpdateCartInput,
  type ApplyCouponInput,
  type CartCheckoutInput,
  type CartSaveDraftInput,
} from './validator';

function handleCartError(res: Response, error: unknown): void {
  if (error instanceof CartError) {
    errorResponse(res, error.message, error.statusCode);
    return;
  }
  const err = error as Error;
  console.error('[Cart Controller Error]', err.message, err.stack);
  errorResponse(res, err.message || 'An error occurred during cart operation.', 500);
}

/**
 * @route   POST /api/v1/cart/preview, /api/v1/cart/calculate
 * @desc    Calculate full transparent price, tax, discount, delivery & other charges breakdown
 * @access  Protected
 */
export const getCartPreview: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as CartPreviewInput;
      const result = await cartService.calculatePreview(req.user!, data);
      successResponse(res, 'Cart preview calculated successfully', result);
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   GET /api/v1/cart
 * @desc    Get active persistent cart with real-time tax and charges breakdown
 * @access  Protected
 */
export const getCart: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const cart = await cartService.getCart(req.user!);
      successResponse(res, 'Cart retrieved successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/cart/items, /api/v1/cart
 * @desc    Add item or increment quantity in persistent cart
 * @access  Protected
 */
export const addItemToCart: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as AddCartItemInput;
      const cart = await cartService.addItem(req.user!, data);
      successResponse(res, 'Item added to cart successfully', { cart }, 201);
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/cart/items/:id
 * @desc    Update quantity of item in persistent cart
 * @access  Protected
 */
export const updateCartItem: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = req.body as UpdateCartItemInput;
      const cart = await cartService.updateItem(req.user!, id, data);
      successResponse(res, 'Cart item updated successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/cart/items/:id
 * @desc    Remove an item from persistent cart
 * @access  Protected
 */
export const removeCartItem: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const cart = await cartService.removeItem(req.user!, id);
      successResponse(res, 'Item removed from cart successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear all items and reset active cart
 * @access  Protected
 */
export const clearCart: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const cart = await cartService.clearCart(req.user!);
      successResponse(res, 'Cart cleared successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   PATCH /api/v1/cart
 * @desc    Update cart notes, delivery address, or custom charges
 * @access  Protected
 */
export const updateCart: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as UpdateCartInput;
      const cart = await cartService.updateCart(req.user!, data);
      successResponse(res, 'Cart updated successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/cart/coupon
 * @desc    Apply a discount coupon to the active cart
 * @access  Protected
 */
export const applyCoupon: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { couponCode } = req.body as ApplyCouponInput;
      const cart = await cartService.applyCoupon(req.user!, couponCode);
      successResponse(res, 'Coupon applied successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   DELETE /api/v1/cart/coupon
 * @desc    Remove applied coupon from the active cart
 * @access  Protected
 */
export const removeCoupon: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const cart = await cartService.removeCoupon(req.user!);
      successResponse(res, 'Coupon removed successfully', { cart });
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/cart/checkout
 * @desc    Place order directly from the active cart and clear it
 * @access  Protected
 */
export const checkoutCart: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as CartCheckoutInput;
      const order = await cartService.checkout(req.user!, data);
      successResponse(res, 'Order placed successfully from cart', { order }, 201);
    } catch (error) {
      handleCartError(res, error);
    }
  },
);

/**
 * @route   POST /api/v1/cart/save-draft
 * @desc    Save active cart directly as a Draft Order
 * @access  Protected
 */
export const saveDraftCart: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as CartSaveDraftInput;
      const draftOrder = await cartService.saveDraft(req.user!, data);
      successResponse(res, 'Draft order saved successfully from cart', { draftOrder }, 201);
    } catch (error) {
      handleCartError(res, error);
    }
  },
);
