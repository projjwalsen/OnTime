import { prisma } from '../../lib/prisma';
import { settingsService } from '../settings/service';
import { couponsService } from '../coupons/service';
import { ordersService } from '../orders/service';
import { draftOrdersService } from '../draft-orders/service';
import {
  type AuthContext,
  type Cart,
  type CartItem,
  type CartSummary,
  type CartPreviewResult,
  type Order,
  type DraftOrder,
  UserRole,
  calculateTierPrice,
} from '@ontime/shared';
import {
  type CartPreviewInput,
  type AddCartItemInput,
  type UpdateCartItemInput,
  type UpdateCartInput,
  type CartCheckoutInput,
  type CartSaveDraftInput,
} from './validator';
import { randomUUID } from 'crypto';

export class CartError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'CartError';
    Object.setPrototypeOf(this, CartError.prototype);
  }
}

export class CartService {
  private isInitialized = false;

  /**
   * Ensure the carts and cart_items tables exist in PostgreSQL.
   */
  async ensureTables(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "carts" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "organisationId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "couponCode" TEXT,
          "notes" TEXT,
          "deliveryAddress" TEXT,
          "deliveryCharge" DECIMAL(10, 2) DEFAULT 0.00,
          "otherCharges" DECIMAL(10, 2) DEFAULT 0.00,
          "otherChargesNote" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "carts_org_user_uidx" ON "carts"("organisationId", "userId");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "cart_items" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "cartId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "variantId" TEXT,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "cart_items_cart_id_idx" ON "cart_items"("cartId");
      `);

      this.isInitialized = true;
    } catch (err) {
      console.warn('[CartService] ensureTables notice:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Calculate detailed preview of items, taxes, discounts, delivery, and other charges.
   * Can be called statelessly for instant UI calculation while placing or drafting orders.
   */
  async calculatePreview(caller: AuthContext, input: CartPreviewInput): Promise<CartPreviewResult> {
    // 1. Resolve target organisation and pricing tier
    let targetOrgId: string | null = null;
    if (caller.role === UserRole.SUPER_ADMIN) {
      targetOrgId = input.organisationId || null;
    } else {
      targetOrgId = caller.organisationId || null;
    }

    let organisation: any = null;
    let pricingTier = 'TIER_1';

    if (targetOrgId) {
      organisation = await prisma.organisation.findUnique({
        where: { id: targetOrgId },
      });
      if (organisation) {
        pricingTier = (organisation.pricingTier || 'TIER_1').toUpperCase();
      }
    }

    const warnings: string[] = [];

    // 2. Fetch and resolve items with retailer pricing tier
    const preparedItems: CartItem[] = [];
    let subtotal = 0;
    let taxableItemsSubtotal = 0;
    let taxExemptSubtotal = 0;

    for (const itemInput of input.items) {
      const product = await prisma.product.findUnique({
        where: { id: itemInput.productId },
        include: {
          category: true,
          variants: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!product) {
        warnings.push(`Product with ID "${itemInput.productId}" not found and was omitted.`);
        continue;
      }
      if (!product.isActive) {
        warnings.push(`Product "${product.name}" (${product.sku}) is currently inactive.`);
      }

      let selectedVariant: any = null;
      let selectedVariantId: string | null = null;
      let variantWeight: string | null = null;
      let effectiveBasePrice = Number(product.price);
      let effectiveTierPrice = calculateTierPrice(
        {
          price: Number(product.price),
          tier1Price: product.tier1Price ? Number(product.tier1Price) : null,
          tier2Price: product.tier2Price ? Number(product.tier2Price) : null,
          tier3Price: product.tier3Price ? Number(product.tier3Price) : null,
        },
        pricingTier,
      );

      if (
        itemInput.variantId &&
        itemInput.variantId.trim() !== '' &&
        itemInput.variantId !== itemInput.productId
      ) {
        selectedVariant = product.variants.find((v) => v.id === itemInput.variantId);
        if (selectedVariant) {
          selectedVariantId = selectedVariant.id;
          variantWeight = selectedVariant.weight;
          effectiveBasePrice = Number(selectedVariant.price);
          effectiveTierPrice = calculateTierPrice(
            {
              price: Number(selectedVariant.price),
              tier1Price: selectedVariant.tier1Price ? Number(selectedVariant.tier1Price) : null,
              tier2Price: selectedVariant.tier2Price ? Number(selectedVariant.tier2Price) : null,
              tier3Price: selectedVariant.tier3Price ? Number(selectedVariant.tier3Price) : null,
            },
            pricingTier,
          );
        } else {
          warnings.push(
            `Variant "${itemInput.variantId}" not found for product "${product.name}", base pricing used.`,
          );
        }
      } else if (product.variants && product.variants.length > 0) {
        const defaultVar = product.variants[0]!;
        selectedVariantId = defaultVar.id;
        variantWeight = defaultVar.weight;
        effectiveBasePrice = Number(defaultVar.price);
        effectiveTierPrice = calculateTierPrice(
          {
            price: Number(defaultVar.price),
            tier1Price: defaultVar.tier1Price ? Number(defaultVar.tier1Price) : null,
            tier2Price: defaultVar.tier2Price ? Number(defaultVar.tier2Price) : null,
            tier3Price: defaultVar.tier3Price ? Number(defaultVar.tier3Price) : null,
          },
          pricingTier,
        );
      }

      const unitPrice = effectiveTierPrice;
      const quantity = Math.max(1, itemInput.quantity || 1);
      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
      const isNoVat = Boolean(product.noVat);

      subtotal += lineTotal;
      if (isNoVat) {
        taxExemptSubtotal += lineTotal;
      } else {
        taxableItemsSubtotal += lineTotal;
      }

      preparedItems.push({
        id: `item-${product.id}-${selectedVariantId || 'base'}`,
        productId: product.id,
        variantId: selectedVariantId,
        productName: product.name,
        productSku: selectedVariant?.sku || product.sku,
        description: product.description,
        image: selectedVariant?.image || product.images?.[0] || null,
        unit: product.unit || 'piece',
        variantWeight,
        basePrice: effectiveBasePrice,
        tierPrice: effectiveTierPrice,
        unitPrice,
        quantity,
        totalPrice: lineTotal,
        noVat: isNoVat,
        taxRate: 0, // Will allocate after global tax calculation
        taxAmount: 0,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    taxExemptSubtotal = Math.round(taxExemptSubtotal * 100) / 100;
    taxableItemsSubtotal = Math.round(taxableItemsSubtotal * 100) / 100;

    // 3. Coupon validation & discount calculation
    let discountAmount = 0;
    let appliedCoupon: CartSummary['appliedCoupon'] = null;

    if (input.couponCode && input.couponCode.trim()) {
      try {
        const couponValidation = await couponsService.validateCoupon(
          input.couponCode.trim(),
          subtotal,
          caller,
        );
        if (couponValidation.valid) {
          discountAmount = couponValidation.discountAmount;
          appliedCoupon = {
            code: couponValidation.coupon.code,
            discountType: couponValidation.coupon.discountType,
            discountValue: couponValidation.coupon.discountValue,
            description: couponValidation.coupon.description,
          };
        } else {
          warnings.push(couponValidation.message || 'Coupon code is not applicable.');
        }
      } catch (err: any) {
        warnings.push(err.message || 'Coupon validation failed.');
      }
    }

    // 4. Tax calculation (deducts proportional discount from taxable items)
    const taxCalc = await settingsService.calculateOrderTax(
      preparedItems.map((pi) => ({
        unitPrice: pi.unitPrice,
        quantity: pi.quantity,
        noVat: pi.noVat,
      })),
      discountAmount,
    );

    const taxAmount = taxCalc.taxAmount;
    const taxRate = taxCalc.taxRate;
    const taxName = taxCalc.taxName || 'VAT';
    const taxableSubtotal = taxCalc.taxableSubtotal;

    // Allocate tax per item for clear transparency
    if (taxAmount > 0 && taxableItemsSubtotal > 0) {
      let allocatedTaxSum = 0;
      for (let i = 0; i < preparedItems.length; i++) {
        const it = preparedItems[i];
        if (it && !it.noVat) {
          it.taxRate = taxRate;
          const share = (it.totalPrice / taxableItemsSubtotal) * taxAmount;
          it.taxAmount = Math.round(share * 100) / 100;
          allocatedTaxSum += it.taxAmount;
        }
      }
      // Reconcile rounding discrepancy on last taxable item
      const diff = Math.round((taxAmount - allocatedTaxSum) * 100) / 100;
      if (diff !== 0) {
        const lastTaxable = preparedItems
          .slice()
          .reverse()
          .find((it) => !it.noVat);
        if (lastTaxable) {
          lastTaxable.taxAmount = Math.round((lastTaxable.taxAmount + diff) * 100) / 100;
        }
      }
    }

    // 5. Delivery and Other Charges calculation
    const taxSettings = await settingsService.getTaxSettings();
    const platformDeliveryFee = Number((taxSettings as any).deliveryCharge || 0);
    const freeDeliveryThreshold = Number((taxSettings as any).freeDeliveryThreshold || 0);
    const platformHandlingFee = Number((taxSettings as any).handlingFee || 0);

    let deliveryCharge = 0;
    let isFreeDelivery = false;

    if (input.deliveryCharge !== undefined && input.deliveryCharge !== null) {
      deliveryCharge = Math.max(0, Number(input.deliveryCharge));
    } else {
      if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) {
        deliveryCharge = 0;
        isFreeDelivery = true;
      } else {
        deliveryCharge = platformDeliveryFee;
      }
    }

    let otherCharges = 0;
    if (input.otherCharges !== undefined && input.otherCharges !== null) {
      otherCharges = Math.max(0, Number(input.otherCharges));
    } else {
      otherCharges = platformHandlingFee;
    }

    // 6. Grand total
    const totalAmount = Math.max(
      0,
      Math.round((subtotal - discountAmount + taxAmount + deliveryCharge + otherCharges) * 100) /
        100,
    );

    const totalUnits = preparedItems.reduce((acc, it) => acc + it.quantity, 0);

    const summary: CartSummary = {
      itemCount: totalUnits,
      uniqueItemCount: preparedItems.length,
      subtotal,
      discountAmount,
      appliedCoupon,
      taxableSubtotal,
      taxExemptSubtotal,
      taxRate,
      taxName,
      taxAmount,
      deliveryCharge,
      isFreeDelivery,
      freeDeliveryThreshold: freeDeliveryThreshold > 0 ? freeDeliveryThreshold : undefined,
      otherCharges,
      otherChargesNote: input.otherChargesNote || null,
      totalAmount,
      currency: 'USD',
      pricingTier,
      retailer: organisation
        ? {
            id: organisation.id,
            name: organisation.name,
            pricingTier,
          }
        : null,
    };

    return {
      items: preparedItems,
      summary,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Helper to retrieve or create the database Cart record for a user/organisation.
   */
  private async getOrCreateCartRecord(caller: AuthContext): Promise<{
    cartId: string;
    organisationId: string;
    userId: string;
    couponCode: string | null;
    notes: string | null;
    deliveryAddress: string | null;
    deliveryCharge: number;
    otherCharges: number;
    otherChargesNote: string | null;
    items: Array<{ id: string; productId: string; variantId: string | null; quantity: number }>;
  }> {
    await this.ensureTables();

    const organisationId = caller.organisationId || 'platform_admin';
    const userId = caller.userId;

    const existingCarts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "carts" WHERE "organisationId" = $1 AND "userId" = $2 LIMIT 1`,
      organisationId,
      userId,
    );

    let cartRecord = existingCarts[0];

    if (!cartRecord) {
      const newCartId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "carts" ("id", "organisationId", "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT ("organisationId", "userId") DO NOTHING`,
        newCartId,
        organisationId,
        userId,
      );

      const refetched = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "carts" WHERE "organisationId" = $1 AND "userId" = $2 LIMIT 1`,
        organisationId,
        userId,
      );
      cartRecord = refetched[0];
    }

    const items = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "cart_items" WHERE "cartId" = $1 ORDER BY "createdAt" ASC`,
      cartRecord.id,
    );

    return {
      cartId: cartRecord.id,
      organisationId: cartRecord.organisationId,
      userId: cartRecord.userId,
      couponCode: cartRecord.couponCode,
      notes: cartRecord.notes,
      deliveryAddress: cartRecord.deliveryAddress,
      deliveryCharge: Number(cartRecord.deliveryCharge || 0),
      otherCharges: Number(cartRecord.otherCharges || 0),
      otherChargesNote: cartRecord.otherChargesNote,
      items: items.map((it) => ({
        id: it.id,
        productId: it.productId,
        variantId: it.variantId,
        quantity: Number(it.quantity),
      })),
    };
  }

  /**
   * Get the active persistent cart for the authenticated user with real-time preview & breakdown.
   */
  async getCart(caller: AuthContext): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    const preview = await this.calculatePreview(caller, {
      items: record.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        quantity: it.quantity,
      })),
      couponCode: record.couponCode,
      deliveryAddress: record.deliveryAddress,
      deliveryCharge: record.deliveryCharge,
      otherCharges: record.otherCharges,
      otherChargesNote: record.otherChargesNote,
    });

    // Attach cart item IDs
    const mappedItems: CartItem[] = preview.items.map((previewItem, idx) => {
      const dbItem = record.items[idx];
      return {
        ...previewItem,
        id: dbItem ? dbItem.id : previewItem.id,
        cartId: record.cartId,
      };
    });

    return {
      id: record.cartId,
      organisationId: record.organisationId,
      userId: record.userId,
      couponCode: record.couponCode,
      notes: record.notes,
      deliveryAddress: record.deliveryAddress,
      deliveryCharge: record.deliveryCharge,
      otherCharges: record.otherCharges,
      otherChargesNote: record.otherChargesNote,
      items: mappedItems,
      summary: preview.summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add an item to the persistent cart (or increment quantity if already present).
   */
  async addItem(caller: AuthContext, data: AddCartItemInput): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    const existingItem = record.items.find(
      (it) =>
        it.productId === data.productId &&
        (it.variantId || null) === (data.variantId?.trim() || null),
    );

    if (existingItem) {
      const newQty = existingItem.quantity + (data.quantity || 1);
      await prisma.$executeRawUnsafe(
        `UPDATE "cart_items" SET "quantity" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        newQty,
        existingItem.id,
      );
    } else {
      const newItemId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "cart_items" ("id", "cartId", "productId", "variantId", "quantity", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        newItemId,
        record.cartId,
        data.productId,
        data.variantId?.trim() || null,
        data.quantity || 1,
      );
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "carts" SET "updatedAt" = NOW() WHERE "id" = $1`,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Update quantity of an item in the cart.
   */
  async updateItem(caller: AuthContext, itemId: string, data: UpdateCartItemInput): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    const item = record.items.find((it) => it.id === itemId);
    if (!item) {
      throw new CartError(`Cart item with ID "${itemId}" not found in your cart.`, 404);
    }

    if (data.quantity <= 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "cart_items" WHERE "id" = $1 AND "cartId" = $2`,
        itemId,
        record.cartId,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "cart_items" SET "quantity" = $1, "variantId" = COALESCE($2, "variantId"), "updatedAt" = NOW()
         WHERE "id" = $3 AND "cartId" = $4`,
        data.quantity,
        data.variantId?.trim() || null,
        itemId,
        record.cartId,
      );
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "carts" SET "updatedAt" = NOW() WHERE "id" = $1`,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Remove an item from the cart.
   */
  async removeItem(caller: AuthContext, itemId: string): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    await prisma.$executeRawUnsafe(
      `DELETE FROM "cart_items" WHERE "id" = $1 AND "cartId" = $2`,
      itemId,
      record.cartId,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "carts" SET "updatedAt" = NOW() WHERE "id" = $1`,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Empty / clear all items from the cart.
   */
  async clearCart(caller: AuthContext): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    await prisma.$executeRawUnsafe(`DELETE FROM "cart_items" WHERE "cartId" = $1`, record.cartId);

    await prisma.$executeRawUnsafe(
      `UPDATE "carts" SET "couponCode" = NULL, "deliveryCharge" = 0, "otherCharges" = 0, "otherChargesNote" = NULL, "updatedAt" = NOW()
       WHERE "id" = $1`,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Update cart metadata (notes, address, custom charges).
   */
  async updateCart(caller: AuthContext, data: UpdateCartInput): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    const notes = data.notes !== undefined ? data.notes : record.notes;
    const address =
      data.deliveryAddress !== undefined ? data.deliveryAddress : record.deliveryAddress;
    const delCharge =
      data.deliveryCharge !== undefined ? data.deliveryCharge : record.deliveryCharge;
    const otherChg = data.otherCharges !== undefined ? data.otherCharges : record.otherCharges;
    const otherNote =
      data.otherChargesNote !== undefined ? data.otherChargesNote : record.otherChargesNote;

    await prisma.$executeRawUnsafe(
      `UPDATE "carts"
       SET "notes" = $1, "deliveryAddress" = $2, "deliveryCharge" = $3, "otherCharges" = $4, "otherChargesNote" = $5, "updatedAt" = NOW()
       WHERE "id" = $6`,
      notes,
      address,
      delCharge,
      otherChg,
      otherNote,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Apply coupon to active cart.
   */
  async applyCoupon(caller: AuthContext, couponCode: string): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    // Calculate subtotal to validate coupon eligibility
    const cart = await this.getCart(caller);
    const validation = await couponsService.validateCoupon(
      couponCode.trim(),
      cart.summary.subtotal,
      caller,
    );

    if (!validation.valid) {
      throw new CartError(validation.message || 'Coupon code is invalid or not applicable.', 400);
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "carts" SET "couponCode" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      validation.coupon.code,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Remove coupon from active cart.
   */
  async removeCoupon(caller: AuthContext): Promise<Cart> {
    const record = await this.getOrCreateCartRecord(caller);

    await prisma.$executeRawUnsafe(
      `UPDATE "carts" SET "couponCode" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
      record.cartId,
    );

    return this.getCart(caller);
  }

  /**
   * Checkout / convert active cart directly into a placed wholesale Order.
   * Clears the cart upon successful placement.
   */
  async checkout(caller: AuthContext, data: CartCheckoutInput): Promise<Order> {
    const cart = await this.getCart(caller);

    if (cart.items.length === 0) {
      throw new CartError('Cannot checkout an empty cart. Please add products first.', 400);
    }

    const order = await ordersService.createOrder(caller, {
      items: cart.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId || undefined,
        quantity: it.quantity,
      })),
      couponCode: cart.couponCode || undefined,
      deliveryAddress: data.deliveryAddress || cart.deliveryAddress || undefined,
      customerPoNumber: data.customerPoNumber || undefined,
      notes: data.notes || cart.notes || undefined,
      organisationId: cart.organisationId,
      deliveryCharge:
        data.deliveryCharge !== undefined && data.deliveryCharge !== null
          ? data.deliveryCharge
          : cart.summary.deliveryCharge,
      otherCharges:
        data.otherCharges !== undefined && data.otherCharges !== null
          ? data.otherCharges
          : cart.summary.otherCharges,
      otherChargesNote: data.otherChargesNote || cart.summary.otherChargesNote || undefined,
    } as any);

    // Clear cart upon successful order creation
    await this.clearCart(caller);

    return order;
  }

  /**
   * Save active cart directly as a Draft Order.
   */
  async saveDraft(caller: AuthContext, data: CartSaveDraftInput): Promise<DraftOrder> {
    const cart = await this.getCart(caller);

    if (cart.items.length === 0) {
      throw new CartError('Cannot save an empty cart as draft. Please add products first.', 400);
    }

    const draft = await draftOrdersService.createDraftOrder(caller, {
      title: data.title || `Cart Draft – ${new Date().toLocaleDateString()}`,
      items: cart.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId || null,
        quantity: it.quantity,
      })),
      couponCode: cart.couponCode || null,
      deliveryAddress: data.deliveryAddress || cart.deliveryAddress || null,
      customerPoNumber: data.customerPoNumber || null,
      notes: data.notes || cart.notes || null,
      deliveryCharge:
        data.deliveryCharge !== undefined && data.deliveryCharge !== null
          ? data.deliveryCharge
          : cart.summary.deliveryCharge,
      otherCharges:
        data.otherCharges !== undefined && data.otherCharges !== null
          ? data.otherCharges
          : cart.summary.otherCharges,
      otherChargesNote: data.otherChargesNote || cart.summary.otherChargesNote || null,
    } as any);

    return draft;
  }
}

export const cartService = new CartService();
