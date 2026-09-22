import { prisma } from '../../lib/prisma';
import { emailService } from '../../lib/email.service';
import {
  type AuthContext,
  type Order,
  type OrderItem,
  type OrderHistory,
  type OrderSummaryStats,
  OrderStatus,
  UserRole,
  isRetailerCancellable,
  isDistributorCancellable,
  ALLOWED_STATUS_TRANSITIONS,
} from '@ontime/shared';
import {
  type CreateOrderInput,
  type ModifyOrderInput,
  type UpdateOrderStatusInput,
  type OrderFilterInput,
} from './validator';

export class OrderError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

function formatOrderHistory(h: {
  id: string;
  orderId: string;
  status: any;
  action: string;
  note: string | null;
  performedByUserId: string | null;
  performedByUserName: string | null;
  performedByUserRole: any;
  metadata?: any;
  createdAt: Date;
}): OrderHistory {
  return {
    id: h.id,
    orderId: h.orderId,
    status: h.status as OrderStatus,
    action: h.action,
    note: h.note ?? null,
    performedByUserId: h.performedByUserId ?? null,
    performedByUserName: h.performedByUserName ?? null,
    performedByUserRole: (h.performedByUserRole as UserRole) ?? null,
    metadata: (h.metadata as Record<string, any>) ?? null,
    createdAt: h.createdAt,
  };
}

function formatOrderItem(item: {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSku: string;
  variantWeight: string | null;
  unitPrice: any;
  quantity: number;
  originalQuantity?: number | null;
  totalPrice: any;
  createdAt: Date;
  updatedAt: Date;
  product?: any;
  variant?: any;
}): OrderItem {
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    productSku: item.productSku,
    variantWeight: item.variantWeight,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    originalQuantity: item.originalQuantity !== undefined ? item.originalQuantity : null,
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
  modificationNote?: string | null;
  modifiedAt?: Date | null;
  deliveryAddress: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organisation?: any;
  createdBy?: any;
  items?: any[];
  history?: any[];
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
    modificationNote: order.modificationNote ?? null,
    modifiedAt: order.modifiedAt ?? null,
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
    items: order.items?.map(formatOrderItem) ?? [],
    history: order.history?.map(formatOrderHistory) ?? [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export class OrdersService {
  /**
   * Helper to retrieve all active Super Admin notification emails.
   */
  private async getSuperAdminEmails(): Promise<string[]> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
        select: { email: true },
      });
      const emails = admins.map((a) => a.email).filter(Boolean);
      return emails.length > 0 ? emails : ['support@ontime.com'];
    } catch {
      return ['support@ontime.com'];
    }
  }

  /**
   * Create a new wholesale order with price snapshotting.
   */
  async createOrder(caller: AuthContext, data: CreateOrderInput): Promise<Order> {
    // Determine organisationId
    let organisationId: string;
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!data.organisationId) {
        throw new OrderError(
          'organisationId is required when creating an order as SUPER_ADMIN',
          400,
        );
      }
      organisationId = data.organisationId;
    } else {
      if (!caller.organisationId) {
        throw new OrderError('Authenticated user is not linked to any retailer organisation', 403);
      }
      organisationId = caller.organisationId;
    }

    // Verify target organisation exists and is active
    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!organisation) {
      throw new OrderError('Retailer organisation not found', 404);
    }
    if (organisation.status !== 'ACTIVE') {
      throw new OrderError('Cannot place orders for an inactive or suspended organisation', 400);
    }

    if (!data.items || data.items.length === 0) {
      throw new OrderError('Order must contain at least one item', 400);
    }

    // Process & validate all items
    const preparedItems: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      productSku: string;
      variantWeight: string | null;
      unitPrice: number;
      quantity: number;
      originalQuantity: number;
      totalPrice: number;
    }> = [];

    let subtotal = 0;

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!product) {
        throw new OrderError(`Product with ID "${item.productId}" not found`, 404);
      }
      if (!product.isActive) {
        throw new OrderError(
          `Product "${product.name}" (${product.sku}) is currently inactive and cannot be ordered`,
          400,
        );
      }

      let unitPrice = Number(product.price);
      let variantWeight: string | null = null;
      let selectedVariantId: string | null = null;

      if (item.variantId && item.variantId.trim() !== '' && item.variantId !== item.productId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          selectedVariantId = variant.id;
          unitPrice = Number(variant.price);
          variantWeight = variant.weight;
        } else {
          throw new OrderError(
            `Variant with ID "${item.variantId}" not found for product "${product.name}"`,
            404,
          );
        }
      } else {
        // User did not select an explicit sub-variant (omitted, null, empty string, or passed productId)
        const defaultVariant = product.variants?.[0];
        if (defaultVariant) {
          // If the product has variants, select the default (first) variant
          selectedVariantId = defaultVariant.id;
          unitPrice = Number(defaultVariant.price);
          variantWeight = defaultVariant.weight;
        } else {
          // Base product without variants
          selectedVariantId = null;
          unitPrice = Number(product.price);
          variantWeight = null;
        }
      }

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      preparedItems.push({
        productId: product.id,
        variantId: selectedVariantId,
        productName: product.name,
        productSku: product.sku,
        variantWeight,
        unitPrice,
        quantity: item.quantity,
        originalQuantity: item.quantity,
        totalPrice: itemTotal,
      });
    }

    const taxAmount = 0.0;
    const totalAmount = subtotal + taxAmount;
    const deliveryAddress = data.deliveryAddress?.trim() || organisation.address || null;

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

    // Transactionally create order, items and initial history entry
    const created = await prisma.$transaction(
      async (tx) => {
        return tx.order.create({
          data: {
            orderNumber,
            organisationId,
            createdByUserId: caller.userId,
            status: OrderStatus.PENDING,
            subtotal,
            taxAmount,
            totalAmount,
            notes: data.notes?.trim() || null,
            deliveryAddress,
            items: {
              create: preparedItems.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName,
                productSku: item.productSku,
                variantWeight: item.variantWeight,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                originalQuantity: item.originalQuantity,
                totalPrice: item.totalPrice,
              })),
            },
            history: {
              create: {
                status: OrderStatus.PENDING,
                action: 'Order Placed',
                note: data.notes?.trim() || 'Order placed by retailer in PENDING state',
                performedByUserId: caller.userId,
                performedByUserName: caller.email,
                performedByUserRole: caller.role,
                metadata: {
                  itemCount: preparedItems.length,
                  totalAmount: subtotal + taxAmount,
                },
              },
            },
          },
          include: {
            items: {
              include: { product: true, variant: true },
              orderBy: { createdAt: 'asc' },
            },
            history: {
              orderBy: { createdAt: 'desc' },
            },
            organisation: true,
            createdBy: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // Asynchronously dispatch order confirmation email in background
    const recipientEmail = created.createdBy?.email || created.organisation?.email;
    if (recipientEmail) {
      emailService
        .sendOrderConfirmationEmail(recipientEmail, {
          orderNumber: created.orderNumber,
          organisationName: created.organisation.name,
          customerName: created.createdBy?.name || 'Valued Customer',
          subtotal: Number(created.subtotal),
          taxAmount: Number(created.taxAmount),
          totalAmount: Number(created.totalAmount),
          items: created.items.map((item) => ({
            name: item.productName,
            sku: item.productSku,
            variant: item.variantWeight,
            quantity: item.quantity,
            originalQuantity: item.originalQuantity ?? item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
          deliveryAddress: created.deliveryAddress,
          notes: created.notes,
          createdAt: created.createdAt,
        })
        .catch((err) => {
          console.error('[OrdersService] Failed to enqueue order confirmation email:', err);
        });
    }

    return formatOrder(created);
  }

  /**
   * Modify Order Items as per warehouse stock availability (Super Admin).
   * Transitions the order to AWAITING and dispatches notification to retailer.
   */
  async modifyOrderStock(
    caller: AuthContext,
    id: string,
    data: ModifyOrderInput,
  ): Promise<Order> {
    if (caller.role !== UserRole.SUPER_ADMIN) {
      throw new OrderError(
        'Forbidden: Only platform administrators can modify orders as per stock',
        403,
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        organisation: true,
        createdBy: true,
      },
    });

    if (!existing) {
      throw new OrderError('Order not found', 404);
    }

    const currentStatus = existing.status as OrderStatus;
    if (
      currentStatus !== OrderStatus.PENDING &&
      currentStatus !== OrderStatus.AWAITING
    ) {
      throw new OrderError(
        `Cannot modify order with status "${currentStatus}". Order modifications are only permitted while PENDING or AWAITING.`,
        400,
      );
    }

    // Filter active items with quantity > 0
    const validItems = data.items.filter((it) => it.quantity > 0);
    if (validItems.length === 0) {
      throw new OrderError(
        'Modified order must have at least one product with quantity greater than 0. If all items are unavailable, please cancel the order instead.',
        400,
      );
    }

    // Process & validate all items
    const preparedItems: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      productSku: string;
      variantWeight: string | null;
      unitPrice: number;
      quantity: number;
      originalQuantity: number;
      totalPrice: number;
    }> = [];

    let subtotal = 0;

    for (const item of validItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { orderBy: { createdAt: 'asc' } } },
      });

      if (!product) {
        throw new OrderError(`Product with ID "${item.productId}" not found`, 404);
      }

      let unitPrice = Number(product.price);
      let variantWeight: string | null = null;
      let selectedVariantId: string | null = null;

      if (item.variantId && item.variantId.trim() !== '' && item.variantId !== item.productId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          selectedVariantId = variant.id;
          unitPrice = Number(variant.price);
          variantWeight = variant.weight;
        } else {
          throw new OrderError(
            `Variant with ID "${item.variantId}" not found for product "${product.name}"`,
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

      // Check if this item existed in the previous order to retain original requested quantity
      const previousMatching = existing.items.find(
        (it) => it.productId === item.productId && it.variantId === selectedVariantId,
      );
      const originalQuantity =
        previousMatching?.originalQuantity || previousMatching?.quantity || item.quantity;

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      preparedItems.push({
        productId: product.id,
        variantId: selectedVariantId,
        productName: product.name,
        productSku: product.sku,
        variantWeight,
        unitPrice,
        quantity: item.quantity,
        originalQuantity,
        totalPrice: itemTotal,
      });
    }

    const taxAmount = 0.0;
    const totalAmount = subtotal + taxAmount;
    const targetStatus = data.status || OrderStatus.AWAITING;

    // Transactionally update items, order and audit history
    const updated = await prisma.$transaction(
      async (tx) => {
        // 1. Delete old order items
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // 2. Create history audit log
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status: targetStatus,
            action:
              targetStatus === OrderStatus.AWAITING
                ? 'Stock Adjusted & Sent for Retailer Approval'
                : 'Order Modified & Confirmed',
            note:
              data.modificationNote?.trim() ||
              'Order line items / quantities adjusted as per stock availability',
            performedByUserId: caller.userId,
            performedByUserName: caller.email,
            performedByUserRole: caller.role,
            metadata: {
              itemCount: preparedItems.length,
              totalAmount,
              modificationNote: data.modificationNote?.trim() || null,
            },
          },
        });

        // 3. Update order record & re-insert items
        return tx.order.update({
          where: { id },
          data: {
            status: targetStatus,
            subtotal,
            taxAmount,
            totalAmount,
            modificationNote: data.modificationNote?.trim() || null,
            modifiedAt: new Date(),
            items: {
              create: preparedItems.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName,
                productSku: item.productSku,
                variantWeight: item.variantWeight,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                originalQuantity: item.originalQuantity,
                totalPrice: item.totalPrice,
              })),
            },
          },
          include: {
            items: {
              include: { product: true, variant: true },
              orderBy: { createdAt: 'asc' },
            },
            history: {
              orderBy: { createdAt: 'desc' },
            },
            organisation: true,
            createdBy: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // Asynchronously dispatch Awaiting approval notification to Retailer
    const recipientEmail = updated.createdBy?.email || updated.organisation?.email;
    if (recipientEmail && targetStatus === OrderStatus.AWAITING) {
      emailService
        .sendPartialOrderAwaitingEmail(recipientEmail, {
          orderNumber: updated.orderNumber,
          organisationName: updated.organisation.name,
          customerName: updated.createdBy?.name || 'Valued Customer',
          subtotal: Number(updated.subtotal),
          taxAmount: Number(updated.taxAmount),
          totalAmount: Number(updated.totalAmount),
          items: updated.items.map((item) => ({
            name: item.productName,
            sku: item.productSku,
            variant: item.variantWeight,
            quantity: item.quantity,
            originalQuantity: item.originalQuantity ?? item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
          deliveryAddress: updated.deliveryAddress,
          notes: updated.notes,
          modificationNote: updated.modificationNote,
          createdAt: updated.createdAt,
        })
        .catch((err) => {
          console.error('[OrdersService] Failed to enqueue partial order awaiting email:', err);
        });
    }

    return formatOrder(updated);
  }

  /**
   * Approve Partial / Modified Order (Retailer or Super Admin on retailer's behalf).
   * Transitions the order into PROCESSING and dispatches notification to Super Admin.
   */
  async approvePartialOrder(
    caller: AuthContext,
    id: string,
    notes?: string,
  ): Promise<Order> {
    const existing = await prisma.order.findUnique({
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

    if (!existing) {
      throw new OrderError('Order not found', 404);
    }

    // Tenant authorization
    if (caller.role !== UserRole.SUPER_ADMIN && existing.organisationId !== caller.organisationId) {
      throw new OrderError(
        'Forbidden: Cannot approve orders belonging to another organisation',
        403,
      );
    }

    if (existing.status !== OrderStatus.AWAITING) {
      throw new OrderError(
        `Cannot approve order with status "${existing.status}". Only orders with status "AWAITING" can be approved.`,
        400,
      );
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status: OrderStatus.PROCESSING,
            action: 'Partial Order Approved by Retailer',
            note: notes?.trim() || 'Retailer accepted modified stock quantities',
            performedByUserId: caller.userId,
            performedByUserName: caller.email,
            performedByUserRole: caller.role,
          },
        });

        return tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.PROCESSING,
            notes: notes?.trim()
              ? existing.notes
                ? `${existing.notes}\n[Approval Note]: ${notes.trim()}`
                : `[Approval Note]: ${notes.trim()}`
              : existing.notes,
          },
          include: {
            items: {
              include: { product: true, variant: true },
              orderBy: { createdAt: 'asc' },
            },
            history: {
              orderBy: { createdAt: 'desc' },
            },
            organisation: true,
            createdBy: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // Dispatch notification to Super Admin(s) that Retailer Approved
    const superAdminEmails = await this.getSuperAdminEmails();
    emailService
      .sendPartialOrderApprovedEmail(superAdminEmails, {
        orderNumber: updated.orderNumber,
        organisationName: updated.organisation.name,
        customerName: updated.createdBy?.name || 'Customer Staff',
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        totalAmount: Number(updated.totalAmount),
        items: updated.items.map((item) => ({
          name: item.productName,
          sku: item.productSku,
          variant: item.variantWeight,
          quantity: item.quantity,
          originalQuantity: item.originalQuantity ?? item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        deliveryAddress: updated.deliveryAddress,
        notes: updated.notes,
        createdAt: updated.createdAt,
      })
      .catch((err) => {
        console.error('[OrdersService] Failed to enqueue partial order approval email:', err);
      });

    return formatOrder(updated);
  }

  /**
   * Reject Partial / Modified Order (Retailer).
   * Transitions the order into REJECTED and dispatches notification to Super Admin.
   */
  async rejectPartialOrder(
    caller: AuthContext,
    id: string,
    reason?: string,
  ): Promise<Order> {
    const existing = await prisma.order.findUnique({
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

    if (!existing) {
      throw new OrderError('Order not found', 404);
    }

    // Tenant authorization
    if (caller.role !== UserRole.SUPER_ADMIN && existing.organisationId !== caller.organisationId) {
      throw new OrderError(
        'Forbidden: Cannot reject orders belonging to another organisation',
        403,
      );
    }

    if (existing.status !== OrderStatus.AWAITING) {
      throw new OrderError(
        `Cannot reject order with status "${existing.status}". Only orders with status "AWAITING" can be rejected.`,
        400,
      );
    }

    const rejectionReason = reason?.trim() || 'Declined by customer (partial stock shortage)';

    const updated = await prisma.$transaction(
      async (tx) => {
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status: OrderStatus.REJECTED,
            action: 'Partial Order Declined by Retailer',
            note: rejectionReason,
            performedByUserId: caller.userId,
            performedByUserName: caller.email,
            performedByUserRole: caller.role,
          },
        });

        return tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.REJECTED,
            cancelledAt: new Date(),
            cancellationReason: rejectionReason,
          },
          include: {
            items: {
              include: { product: true, variant: true },
              orderBy: { createdAt: 'asc' },
            },
            history: {
              orderBy: { createdAt: 'desc' },
            },
            organisation: true,
            createdBy: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // Dispatch notification to Super Admin(s) that Retailer Rejected
    const superAdminEmails = await this.getSuperAdminEmails();
    emailService
      .sendPartialOrderRejectedEmail(superAdminEmails, {
        orderNumber: updated.orderNumber,
        organisationName: updated.organisation.name,
        customerName: updated.createdBy?.name || 'Customer Staff',
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        totalAmount: Number(updated.totalAmount),
        items: updated.items.map((item) => ({
          name: item.productName,
          sku: item.productSku,
          variant: item.variantWeight,
          quantity: item.quantity,
          originalQuantity: item.originalQuantity ?? item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        deliveryAddress: updated.deliveryAddress,
        notes: updated.notes,
        cancellationReason: rejectionReason,
        rejectionReason,
        createdAt: updated.createdAt,
      })
      .catch((err) => {
        console.error('[OrdersService] Failed to enqueue partial order rejection email:', err);
      });

    return formatOrder(updated);
  }

  /**
   * List orders with multi-tenant scoping and filters.
   */
  async listOrders(
    caller: AuthContext,
    filters: OrderFilterInput,
  ): Promise<{
    orders: Order[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Multi-tenant boundary enforcement
    if (caller.role !== UserRole.SUPER_ADMIN) {
      where.organisationId = caller.organisationId;
    } else if (filters.organisationId) {
      where.organisationId = filters.organisationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { modificationNote: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
        { cancellationReason: { contains: search, mode: 'insensitive' } },
        { organisation: { name: { contains: search, mode: 'insensitive' } } },
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

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
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
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      orders: orders.map(formatOrder),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single order by ID with tenant boundary validation.
   */
  async getOrderById(caller: AuthContext, id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
        organisation: true,
        createdBy: true,
      },
    });

    if (!order) {
      throw new OrderError('Order not found', 404);
    }

    // Verify multi-tenant access
    if (caller.role !== UserRole.SUPER_ADMIN && order.organisationId !== caller.organisationId) {
      throw new OrderError(
        'Forbidden: Cannot access orders belonging to another organisation',
        403,
      );
    }

    return formatOrder(order);
  }

  /**
   * Get timestamped order history audit trail.
   */
  async getOrderHistory(caller: AuthContext, id: string): Promise<OrderHistory[]> {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { organisationId: true },
    });

    if (!order) {
      throw new OrderError('Order not found', 404);
    }

    if (caller.role !== UserRole.SUPER_ADMIN && order.organisationId !== caller.organisationId) {
      throw new OrderError(
        'Forbidden: Cannot access order history belonging to another organisation',
        403,
      );
    }

    const history = await prisma.orderHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return history.map(formatOrderHistory);
  }

  /**
   * Update order status (Super Admin lifecycle progression).
   */
  async updateOrderStatus(
    caller: AuthContext,
    id: string,
    data: UpdateOrderStatusInput,
  ): Promise<Order> {
    if (caller.role !== UserRole.SUPER_ADMIN) {
      throw new OrderError(
        'Forbidden: Only platform administrators can transition order fulfillment status',
        403,
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new OrderError('Order not found', 404);
    }

    const currentStatus = existing.status as OrderStatus;
    const nextStatus = data.status;

    if (currentStatus === OrderStatus.DELIVERED) {
      throw new OrderError('Cannot update status of an already delivered order', 400);
    }
    if (currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.REJECTED) {
      throw new OrderError('Cannot update status of a cancelled or rejected order', 400);
    }

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      throw new OrderError(
        `Invalid status transition from "${currentStatus}" to "${nextStatus}". Allowed transitions: ${allowedNext.join(', ') || 'None'}`,
        400,
      );
    }

    const updateData: any = {
      status: nextStatus,
    };

    if (data.modificationNote) {
      updateData.modificationNote = data.modificationNote.trim();
    }

    if (nextStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (nextStatus === OrderStatus.CANCELLED || nextStatus === OrderStatus.REJECTED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason =
        data.cancellationReason?.trim() || `Marked as ${nextStatus} by distributor`;
    }

    const actionText =
      nextStatus === OrderStatus.CONFIRMED
        ? 'Order Confirmed by Super Admin'
        : nextStatus === OrderStatus.PROCESSING
        ? 'Order Processing Started'
        : nextStatus === OrderStatus.DISPATCHED
        ? 'Order Dispatched for Delivery'
        : nextStatus === OrderStatus.DELIVERED
        ? 'Order Delivered to Customer'
        : nextStatus === OrderStatus.CANCELLED
        ? 'Order Cancelled'
        : `Status updated from ${currentStatus} to ${nextStatus}`;

    const updated = await prisma.$transaction(
      async (tx) => {
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status: nextStatus,
            action: actionText,
            note: data.cancellationReason?.trim() || data.modificationNote?.trim() || null,
            performedByUserId: caller.userId,
            performedByUserName: caller.email,
            performedByUserRole: caller.role,
          },
        });

        return tx.order.update({
          where: { id },
          data: updateData,
          include: {
            items: {
              include: { product: true, variant: true },
              orderBy: { createdAt: 'asc' },
            },
            history: {
              orderBy: { createdAt: 'desc' },
            },
            organisation: true,
            createdBy: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // Asynchronously dispatch order status update email
    const recipientEmail = updated.createdBy?.email || updated.organisation?.email;
    if (recipientEmail) {
      const emailPayload = {
        orderNumber: updated.orderNumber,
        organisationName: updated.organisation.name,
        customerName: updated.createdBy?.name || 'Valued Customer',
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        totalAmount: Number(updated.totalAmount),
        items: updated.items.map((item) => ({
          name: item.productName,
          sku: item.productSku,
          variant: item.variantWeight,
          quantity: item.quantity,
          originalQuantity: item.originalQuantity ?? item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        deliveryAddress: updated.deliveryAddress,
        notes: updated.notes,
        modificationNote: updated.modificationNote,
        cancellationReason: updated.cancellationReason,
        createdAt: updated.createdAt,
      };

      if (nextStatus === OrderStatus.CANCELLED || nextStatus === OrderStatus.REJECTED) {
        emailService.sendOrderCancelledEmail(recipientEmail, emailPayload).catch((err) => {
          console.error('[OrdersService] Failed to enqueue order cancellation email:', err);
        });
      } else {
        emailService
          .sendOrderStatusUpdateEmail(recipientEmail, emailPayload, currentStatus, nextStatus)
          .catch((err) => {
            console.error('[OrdersService] Failed to enqueue order status update email:', err);
          });
      }
    }

    return formatOrder(updated);
  }

  /**
   * Cancel an order (Retailer while PENDING or AWAITING, or Super Admin before DELIVERED).
   */
  async cancelOrder(caller: AuthContext, id: string, reason?: string): Promise<Order> {
    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new OrderError('Order not found', 404);
    }

    const currentStatus = existing.status as OrderStatus;

    if (currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.REJECTED) {
      throw new OrderError('Order is already cancelled or rejected', 400);
    }

    // Role specific cancellation rules
    if (caller.role !== UserRole.SUPER_ADMIN) {
      if (existing.organisationId !== caller.organisationId) {
        throw new OrderError(
          'Forbidden: Cannot cancel orders belonging to another organisation',
          403,
        );
      }
      if (!isRetailerCancellable(currentStatus)) {
        throw new OrderError(
          `Retailers can only cancel orders while in PENDING or AWAITING status. Current status is "${currentStatus}". Please contact support to request cancellation.`,
          400,
        );
      }
    } else {
      if (!isDistributorCancellable(currentStatus)) {
        throw new OrderError(`Cannot cancel an order with status "${currentStatus}"`, 400);
      }
    }

    const cancelReason =
      reason?.trim() ||
      (caller.role === UserRole.SUPER_ADMIN
        ? 'Cancelled by platform admin'
        : 'Cancelled by customer');

    const updated = await prisma.$transaction(
      async (tx) => {
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status: OrderStatus.CANCELLED,
            action:
              caller.role === UserRole.SUPER_ADMIN
                ? 'Order Cancelled by Super Admin'
                : 'Order Cancelled by Retailer',
            note: cancelReason,
            performedByUserId: caller.userId,
            performedByUserName: caller.email,
            performedByUserRole: caller.role,
          },
        });

        return tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: cancelReason,
          },
          include: {
            items: {
              include: { product: true, variant: true },
              orderBy: { createdAt: 'asc' },
            },
            history: {
              orderBy: { createdAt: 'desc' },
            },
            organisation: true,
            createdBy: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );

    // Asynchronously dispatch order cancellation email
    const cancelRecipientEmail = updated.createdBy?.email || updated.organisation?.email;
    if (cancelRecipientEmail) {
      emailService
        .sendOrderCancelledEmail(cancelRecipientEmail, {
          orderNumber: updated.orderNumber,
          organisationName: updated.organisation.name,
          customerName: updated.createdBy?.name || 'Valued Customer',
          subtotal: Number(updated.subtotal),
          taxAmount: Number(updated.taxAmount),
          totalAmount: Number(updated.totalAmount),
          items: updated.items.map((item) => ({
            name: item.productName,
            sku: item.productSku,
            variant: item.variantWeight,
            quantity: item.quantity,
            originalQuantity: item.originalQuantity ?? item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
          deliveryAddress: updated.deliveryAddress,
          notes: updated.notes,
          cancellationReason: updated.cancellationReason,
          createdAt: updated.createdAt,
        })
        .catch((err) => {
          console.error('[OrdersService] Failed to enqueue order cancellation email:', err);
        });
    }

    return formatOrder(updated);
  }

  /**
   * Get order summary statistics.
   */
  async getOrderStats(caller: AuthContext, organisationId?: string): Promise<OrderSummaryStats> {
    const where: any = {};

    if (caller.role !== UserRole.SUPER_ADMIN) {
      where.organisationId = caller.organisationId;
    } else if (organisationId) {
      where.organisationId = organisationId;
    }

    const [
      totalOrders,
      pendingOrders,
      awaitingOrders,
      confirmedOrders,
      processingOrders,
      dispatchedOrders,
      deliveredOrders,
      cancelledOrders,
      rejectedOrders,
      revenueResult,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.AWAITING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.DISPATCHED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.REJECTED } }),
      prisma.order.aggregate({
        where: {
          ...where,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      awaitingOrders,
      confirmedOrders,
      processingOrders,
      dispatchedOrders,
      deliveredOrders,
      cancelledOrders,
      rejectedOrders,
      totalRevenue: Number(revenueResult._sum.totalAmount || 0),
    };
  }
}

export const ordersService = new OrdersService();

