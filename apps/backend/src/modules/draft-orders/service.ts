import { prisma } from '../../lib/prisma';
import {
  type AuthContext,
  type DraftOrder,
  type DraftOrderItem,
  type Order,
  OrderStatus,
  UserRole,
} from '@ontime/shared';
import {
  type CreateDraftOrderInput,
  type UpdateDraftOrderInput,
  type AddDraftOrderItemInput,
  type UpdateDraftOrderItemInput,
  type ConvertDraftOrderInput,
  type DraftOrderFilterInput,
} from './validator';

export class DraftOrderError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DraftOrderError';
  }
}

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

function formatDraftOrderItem(item: {
  id: string;
  draftOrderId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSku: string;
  variantWeight: string | null;
  unitPrice: any;
  quantity: number;
  totalPrice: any;
  createdAt: Date;
  updatedAt: Date;
  product?: any;
  variant?: any;
}): DraftOrderItem {
  return {
    id: item.id,
    draftOrderId: item.draftOrderId,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    productSku: item.productSku,
    variantWeight: item.variantWeight,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    totalPrice: Number(item.totalPrice),
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          description: item.product.description,
          price: Number(item.product.price),
          categoryId: item.product.categoryId,
          unit: item.product.unit,
          isActive: item.product.isActive,
          images: item.product.images ?? [],
          packagingNote: item.product.packagingNote ?? null,
          createdAt: item.product.createdAt,
          updatedAt: item.product.updatedAt,
        }
      : null,
    variant: item.variant
      ? {
          id: item.variant.id,
          productId: item.variant.productId,
          weight: item.variant.weight,
          description: item.variant.description,
          image: item.variant.image,
          price: Number(item.variant.price),
          createdAt: item.variant.createdAt,
          updatedAt: item.variant.updatedAt,
        }
      : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function formatDraftOrder(order: {
  id: string;
  organisationId: string;
  createdByUserId: string;
  title: string | null;
  notes: string | null;
  deliveryAddress: string | null;
  subtotal: any;
  taxAmount: any;
  totalAmount: any;
  createdAt: Date;
  updatedAt: Date;
  organisation?: any;
  createdBy?: any;
  items?: any[];
}): DraftOrder {
  return {
    id: order.id,
    organisationId: order.organisationId,
    createdByUserId: order.createdByUserId,
    title: order.title,
    notes: order.notes,
    deliveryAddress: order.deliveryAddress,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    totalAmount: Number(order.totalAmount),
    organisation: order.organisation
      ? {
          id: order.organisation.id,
          name: order.organisation.name,
          email: order.organisation.email,
          mobile: order.organisation.mobile,
          address: order.organisation.address,
          area: order.organisation.area,
          city: order.organisation.city,
          taxNumber: order.organisation.taxNumber,
          status: order.organisation.status,
          createdAt: order.organisation.createdAt,
          updatedAt: order.organisation.updatedAt,
        }
      : null,
    createdBy: order.createdBy
      ? {
          id: order.createdBy.id,
          email: order.createdBy.email,
          name: order.createdBy.name,
          mobile: order.createdBy.mobile,
          role: order.createdBy.role,
          organisationId: order.createdBy.organisationId,
          isActive: order.createdBy.isActive,
          createdAt: order.createdBy.createdAt,
          updatedAt: order.createdBy.updatedAt,
        }
      : null,
    items: order.items?.map(formatDraftOrderItem) ?? [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function formatOrder(order: {
  id: string;
  orderNumber: string;
  organisationId: string;
  createdByUserId: string;
  status: any;
  subtotal: any;
  taxAmount: any;
  totalAmount: any;
  notes: string | null;
  deliveryAddress: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organisation?: any;
  createdBy?: any;
  items?: any[];
}): Order {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    organisationId: order.organisationId,
    createdByUserId: order.createdByUserId,
    status: order.status as OrderStatus,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    deliveryAddress: order.deliveryAddress,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt,
    deliveredAt: order.deliveredAt,
    organisation: order.organisation
      ? {
          id: order.organisation.id,
          name: order.organisation.name,
          email: order.organisation.email,
          mobile: order.organisation.mobile,
          address: order.organisation.address,
          area: order.organisation.area,
          city: order.organisation.city,
          taxNumber: order.organisation.taxNumber,
          status: order.organisation.status,
          createdAt: order.organisation.createdAt,
          updatedAt: order.organisation.updatedAt,
        }
      : null,
    createdBy: order.createdBy
      ? {
          id: order.createdBy.id,
          email: order.createdBy.email,
          name: order.createdBy.name,
          mobile: order.createdBy.mobile,
          role: order.createdBy.role,
          organisationId: order.createdBy.organisationId,
          isActive: order.createdBy.isActive,
          createdAt: order.createdBy.createdAt,
          updatedAt: order.createdBy.updatedAt,
        }
      : null,
    items:
      order.items?.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        productSku: item.productSku,
        variantWeight: item.variantWeight,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        totalPrice: Number(item.totalPrice),
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              sku: item.product.sku,
              description: item.product.description,
              price: Number(item.product.price),
              categoryId: item.product.categoryId,
              unit: item.product.unit,
              isActive: item.product.isActive,
              images: item.product.images ?? [],
              packagingNote: item.product.packagingNote ?? null,
              createdAt: item.product.createdAt,
              updatedAt: item.product.updatedAt,
            }
          : null,
        variant: item.variant
          ? {
              id: item.variant.id,
              productId: item.variant.productId,
              weight: item.variant.weight,
              description: item.variant.description,
              image: item.variant.image,
              price: Number(item.variant.price),
              createdAt: item.variant.createdAt,
              updatedAt: item.variant.updatedAt,
            }
          : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) ?? [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export class DraftOrdersService {
  /**
   * Ensure caller is an authenticated retailer organisation user (ADMIN or STAFF).
   */
  private assertRetailerAccess(caller: AuthContext): string {
    if (caller.role === UserRole.SUPER_ADMIN || !caller.organisationId) {
      throw new DraftOrderError(
        'Forbidden: Draft orders are private to retailer organisations and cannot be accessed by platform administrators',
        403,
      );
    }
    return caller.organisationId;
  }

  /**
   * Helper to resolve product and variant pricing.
   */
  private async resolveItemPricing(productId: string, variantId?: string | null) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new DraftOrderError(`Product with ID "${productId}" not found`, 404);
    }
    if (!product.isActive) {
      throw new DraftOrderError(
        `Product "${product.name}" (${product.sku}) is currently inactive and cannot be added to a draft order`,
        400,
      );
    }

    let unitPrice = Number(product.price);
    let variantWeight: string | null = null;
    let selectedVariantId: string | null = null;

    if (variantId && variantId.trim() !== '' && variantId !== productId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        selectedVariantId = variant.id;
        unitPrice = Number(variant.price);
        variantWeight = variant.weight;
      } else {
        throw new DraftOrderError(
          `Variant with ID "${variantId}" not found for product "${product.name}"`,
          404,
        );
      }
    } else {
      const defaultVariant = product.variants?.[0];
      if (defaultVariant) {
        selectedVariantId = defaultVariant.id;
        unitPrice = Number(defaultVariant.price);
        variantWeight = defaultVariant.weight;
      } else {
        selectedVariantId = null;
        unitPrice = Number(product.price);
        variantWeight = null;
      }
    }

    return {
      product,
      selectedVariantId,
      variantWeight,
      unitPrice,
    };
  }

  /**
   * Create a new draft order for a retailer organisation.
   */
  async createDraftOrder(caller: AuthContext, data: CreateDraftOrderInput): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!organisation) {
      throw new DraftOrderError('Retailer organisation not found', 404);
    }
    if (organisation.status !== 'ACTIVE') {
      throw new DraftOrderError(
        'Cannot create draft orders for an inactive or suspended organisation',
        400,
      );
    }

    const preparedItems: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      productSku: string;
      variantWeight: string | null;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }> = [];

    let subtotal = 0;

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const resolved = await this.resolveItemPricing(item.productId, item.variantId);
        const itemTotal = resolved.unitPrice * item.quantity;
        subtotal += itemTotal;

        preparedItems.push({
          productId: resolved.product.id,
          variantId: resolved.selectedVariantId,
          productName: resolved.product.name,
          productSku: resolved.product.sku,
          variantWeight: resolved.variantWeight,
          unitPrice: resolved.unitPrice,
          quantity: item.quantity,
          totalPrice: itemTotal,
        });
      }
    }

    const taxAmount = 0.0;
    const totalAmount = subtotal + taxAmount;
    const deliveryAddress = data.deliveryAddress?.trim() || organisation.address || null;

    const draftOrder = await prisma.draftOrder.create({
      data: {
        organisationId,
        createdByUserId: caller.userId,
        title: data.title?.trim() || null,
        notes: data.notes?.trim() || null,
        deliveryAddress,
        subtotal,
        taxAmount,
        totalAmount,
        items: {
          create: preparedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            productSku: item.productSku,
            variantWeight: item.variantWeight,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: 'asc' },
        },
        organisation: true,
        createdBy: true,
      },
    });

    return formatDraftOrder(draftOrder);
  }

  /**
   * List draft orders for the authenticated retailer organisation.
   */
  async listDraftOrders(
    caller: AuthContext,
    filters: DraftOrderFilterInput,
  ): Promise<{
    draftOrders: DraftOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const organisationId = this.assertRetailerAccess(caller);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organisationId,
    };

    if (filters.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [total, drafts] = await Promise.all([
      prisma.draftOrder.count({ where }),
      prisma.draftOrder.findMany({
        where,
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: 'asc' },
          },
          organisation: true,
          createdBy: true,
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      draftOrders: drafts.map(formatDraftOrder),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get draft order details by ID with tenant security check.
   */
  async getDraftOrderById(caller: AuthContext, id: string): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const draft = await prisma.draftOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: 'asc' },
        },
        organisation: true,
        createdBy: true,
      },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot access draft orders belonging to another organisation',
        403,
      );
    }

    return formatDraftOrder(draft);
  }

  /**
   * Update draft order metadata and/or replace items.
   */
  async updateDraftOrder(
    caller: AuthContext,
    id: string,
    data: UpdateDraftOrderInput,
  ): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const existing = await prisma.draftOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (existing.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot modify draft orders belonging to another organisation',
        403,
      );
    }

    return await prisma.$transaction(async (tx) => {
      let subtotal = Number(existing.subtotal);

      // If replacement items are provided
      if (data.items !== undefined) {
        // Remove previous items
        await tx.draftOrderItem.deleteMany({
          where: { draftOrderId: id },
        });

        subtotal = 0;
        const preparedItems: Array<{
          draftOrderId: string;
          productId: string;
          variantId: string | null;
          productName: string;
          productSku: string;
          variantWeight: string | null;
          unitPrice: number;
          quantity: number;
          totalPrice: number;
        }> = [];

        for (const item of data.items) {
          const resolved = await this.resolveItemPricing(item.productId, item.variantId);
          const itemTotal = resolved.unitPrice * item.quantity;
          subtotal += itemTotal;

          preparedItems.push({
            draftOrderId: id,
            productId: resolved.product.id,
            variantId: resolved.selectedVariantId,
            productName: resolved.product.name,
            productSku: resolved.product.sku,
            variantWeight: resolved.variantWeight,
            unitPrice: resolved.unitPrice,
            quantity: item.quantity,
            totalPrice: itemTotal,
          });
        }

        if (preparedItems.length > 0) {
          await tx.draftOrderItem.createMany({
            data: preparedItems,
          });
        }
      }

      const totalAmount = subtotal;

      const updated = await tx.draftOrder.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title?.trim() || null : existing.title,
          notes: data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
          deliveryAddress:
            data.deliveryAddress !== undefined
              ? data.deliveryAddress?.trim() || null
              : existing.deliveryAddress,
          subtotal,
          totalAmount,
        },
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: 'asc' },
          },
          organisation: true,
          createdBy: true,
        },
      });

      return formatDraftOrder(updated);
    });
  }

  /**
   * Add an item to a draft order (or increment quantity if already exists).
   */
  async addItemToDraft(
    caller: AuthContext,
    draftOrderId: string,
    data: AddDraftOrderItemInput,
  ): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const draft = await prisma.draftOrder.findUnique({
      where: { id: draftOrderId },
      include: { items: true },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot modify draft orders belonging to another organisation',
        403,
      );
    }

    const resolved = await this.resolveItemPricing(data.productId, data.variantId);

    return await prisma.$transaction(async (tx) => {
      // Check if product+variant already exists in this draft
      const existingItem = draft.items.find(
        (i) =>
          i.productId === resolved.product.id &&
          (i.variantId === resolved.selectedVariantId ||
            (!i.variantId && !resolved.selectedVariantId)),
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + data.quantity;
        const newTotal = resolved.unitPrice * newQuantity;
        await tx.draftOrderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            unitPrice: resolved.unitPrice,
            totalPrice: newTotal,
            variantWeight: resolved.variantWeight,
            variantId: resolved.selectedVariantId,
          },
        });
      } else {
        const itemTotal = resolved.unitPrice * data.quantity;
        await tx.draftOrderItem.create({
          data: {
            draftOrderId,
            productId: resolved.product.id,
            variantId: resolved.selectedVariantId,
            productName: resolved.product.name,
            productSku: resolved.product.sku,
            variantWeight: resolved.variantWeight,
            unitPrice: resolved.unitPrice,
            quantity: data.quantity,
            totalPrice: itemTotal,
          },
        });
      }

      // Recalculate draft totals
      const allItems = await tx.draftOrderItem.findMany({
        where: { draftOrderId },
      });
      const subtotal = allItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
      const totalAmount = subtotal;

      const updated = await tx.draftOrder.update({
        where: { id: draftOrderId },
        data: { subtotal, totalAmount },
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: 'asc' },
          },
          organisation: true,
          createdBy: true,
        },
      });

      return formatDraftOrder(updated);
    });
  }

  /**
   * Update quantity or variant of a line item in a draft order.
   */
  async updateDraftItem(
    caller: AuthContext,
    draftOrderId: string,
    itemId: string,
    data: UpdateDraftOrderItemInput,
  ): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const draft = await prisma.draftOrder.findUnique({
      where: { id: draftOrderId },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot modify draft orders belonging to another organisation',
        403,
      );
    }

    const item = await prisma.draftOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.draftOrderId !== draftOrderId) {
      throw new DraftOrderError('Draft order line item not found', 404);
    }

    return await prisma.$transaction(async (tx) => {
      const quantity = data.quantity !== undefined ? data.quantity : item.quantity;
      let unitPrice = Number(item.unitPrice);
      let variantWeight = item.variantWeight;
      let variantId = item.variantId;

      if (data.variantId !== undefined) {
        const resolved = await this.resolveItemPricing(item.productId, data.variantId);
        unitPrice = resolved.unitPrice;
        variantWeight = resolved.variantWeight;
        variantId = resolved.selectedVariantId;
      }

      const totalPrice = unitPrice * quantity;

      await tx.draftOrderItem.update({
        where: { id: itemId },
        data: {
          quantity,
          unitPrice,
          totalPrice,
          variantId,
          variantWeight,
        },
      });

      const allItems = await tx.draftOrderItem.findMany({
        where: { draftOrderId },
      });
      const subtotal = allItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
      const totalAmount = subtotal;

      const updated = await tx.draftOrder.update({
        where: { id: draftOrderId },
        data: { subtotal, totalAmount },
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: 'asc' },
          },
          organisation: true,
          createdBy: true,
        },
      });

      return formatDraftOrder(updated);
    });
  }

  /**
   * Remove a line item from a draft order.
   */
  async removeItemFromDraft(
    caller: AuthContext,
    draftOrderId: string,
    itemId: string,
  ): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const draft = await prisma.draftOrder.findUnique({
      where: { id: draftOrderId },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot modify draft orders belonging to another organisation',
        403,
      );
    }

    const item = await prisma.draftOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.draftOrderId !== draftOrderId) {
      throw new DraftOrderError('Draft order line item not found', 404);
    }

    return await prisma.$transaction(async (tx) => {
      await tx.draftOrderItem.delete({
        where: { id: itemId },
      });

      const allItems = await tx.draftOrderItem.findMany({
        where: { draftOrderId },
      });
      const subtotal = allItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
      const totalAmount = subtotal;

      const updated = await tx.draftOrder.update({
        where: { id: draftOrderId },
        data: { subtotal, totalAmount },
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: 'asc' },
          },
          organisation: true,
          createdBy: true,
        },
      });

      return formatDraftOrder(updated);
    });
  }

  /**
   * Bulk remove line items from a draft order.
   */
  async bulkRemoveItemsFromDraft(
    caller: AuthContext,
    draftOrderId: string,
    itemIds: string[],
  ): Promise<DraftOrder> {
    const organisationId = this.assertRetailerAccess(caller);

    const draft = await prisma.draftOrder.findUnique({
      where: { id: draftOrderId },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot modify draft orders belonging to another organisation',
        403,
      );
    }

    if (!itemIds || itemIds.length === 0) {
      return this.getDraftOrderById(caller, draftOrderId);
    }

    return await prisma.$transaction(async (tx) => {
      await tx.draftOrderItem.deleteMany({
        where: {
          draftOrderId,
          id: { in: itemIds },
        },
      });

      const allItems = await tx.draftOrderItem.findMany({
        where: { draftOrderId },
      });
      const subtotal = allItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
      const totalAmount = subtotal;

      const updated = await tx.draftOrder.update({
        where: { id: draftOrderId },
        data: { subtotal, totalAmount },
        include: {
          items: {
            include: { product: true, variant: true },
            orderBy: { createdAt: 'asc' },
          },
          organisation: true,
          createdBy: true,
        },
      });

      return formatDraftOrder(updated);
    });
  }


  /**
   * Delete / discard a draft order.
   */
  async deleteDraftOrder(caller: AuthContext, id: string): Promise<void> {
    const organisationId = this.assertRetailerAccess(caller);

    const draft = await prisma.draftOrder.findUnique({
      where: { id },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot delete draft orders belonging to another organisation',
        403,
      );
    }

    await prisma.draftOrder.delete({
      where: { id },
    });
  }

  /**
   * Convert a draft order into an official wholesale Order.
   */
  async convertDraftToOrder(
    caller: AuthContext,
    id: string,
    overrides?: ConvertDraftOrderInput,
  ): Promise<Order> {
    const organisationId = this.assertRetailerAccess(caller);

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new DraftOrderError('Retailer organisation not found', 404);
    }

    if (organisation.status !== 'ACTIVE') {
      throw new DraftOrderError(
        'Cannot place orders for an inactive or suspended organisation',
        400,
      );
    }

    const draft = await prisma.draftOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!draft) {
      throw new DraftOrderError('Draft order not found', 404);
    }

    if (draft.organisationId !== organisationId) {
      throw new DraftOrderError(
        'Forbidden: Cannot convert draft orders belonging to another organisation',
        403,
      );
    }

    if (!draft.items || draft.items.length === 0) {
      throw new DraftOrderError(
        'Draft order must contain at least one item before converting to a live order',
        400,
      );
    }

    // Re-verify current live catalog pricing & product active state
    const preparedOrderItems: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      productSku: string;
      variantWeight: string | null;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }> = [];

    let subtotal = 0;

    for (const draftItem of draft.items) {
      const resolved = await this.resolveItemPricing(draftItem.productId, draftItem.variantId);
      const itemTotal = resolved.unitPrice * draftItem.quantity;
      subtotal += itemTotal;

      preparedOrderItems.push({
        productId: resolved.product.id,
        variantId: resolved.selectedVariantId,
        productName: resolved.product.name,
        productSku: resolved.product.sku,
        variantWeight: resolved.variantWeight,
        unitPrice: resolved.unitPrice,
        quantity: draftItem.quantity,
        totalPrice: itemTotal,
      });
    }

    const taxAmount = 0.0;
    const totalAmount = subtotal + taxAmount;
    const notes = overrides?.notes?.trim() ?? draft.notes;
    const deliveryAddress =
      overrides?.deliveryAddress?.trim() ?? draft.deliveryAddress ?? organisation.address ?? null;

    // Retry loop for unique order number collision resilience
    let orderNumber = generateOrderNumber();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber },
      });
      if (!existing) {
        isUnique = true;
      } else {
        orderNumber = generateOrderNumber();
        attempts++;
      }
    }

    // Transactionally create real order and delete the draft
    const createdOrder = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          organisationId,
          createdByUserId: caller.userId,
          status: OrderStatus.PENDING,
          subtotal,
          taxAmount,
          totalAmount,
          notes,
          deliveryAddress,
          items: {
            create: preparedOrderItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              productSku: item.productSku,
              variantWeight: item.variantWeight,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: {
            include: { product: true, variant: true },
          },
          organisation: true,
          createdBy: true,
        },
      });

      // Delete draft order
      await tx.draftOrder.delete({
        where: { id },
      });

      return newOrder;
    });

    return formatOrder(createdOrder);
  }
}

export const draftOrdersService = new DraftOrdersService();
