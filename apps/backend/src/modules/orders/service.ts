import { prisma } from '../../lib/prisma';
import {
  type AuthContext,
  type Order,
  type OrderItem,
  type OrderSummaryStats,
  OrderStatus,
  UserRole,
  isRetailerCancellable,
  isDistributorCancellable,
  ALLOWED_STATUS_TRANSITIONS,
} from '@ontime/shared';
import {
  type CreateOrderInput,
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
    items: order.items?.map(formatOrderItem) ?? [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export class OrdersService {
  /**
   * Create a new wholesale order with price snapshotting.
   */
  async createOrder(caller: AuthContext, data: CreateOrderInput): Promise<Order> {
    // Determine organisationId
    let organisationId: string;
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!data.organisationId) {
        throw new OrderError('organisationId is required when creating an order as SUPER_ADMIN', 400);
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
      totalPrice: number;
    }> = [];

    let subtotal = 0;

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product) {
        throw new OrderError(`Product with ID "${item.productId}" not found`, 404);
      }
      if (!product.isActive) {
        throw new OrderError(`Product "${product.name}" (${product.sku}) is currently inactive and cannot be ordered`, 400);
      }

      let unitPrice = Number(product.price);
      let variantWeight: string | null = null;
      let selectedVariantId: string | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new OrderError(`Variant with ID "${item.variantId}" not found for product "${product.name}"`, 404);
        }
        selectedVariantId = variant.id;
        unitPrice = Number(variant.price);
        variantWeight = variant.weight;
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
        totalPrice: itemTotal,
      });
    }

    const taxAmount = 0.00;
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

    // Transactionally create order and items
    const created = await prisma.$transaction(async (tx) => {
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
    });

    return formatOrder(created);
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
        organisation: true,
        createdBy: true,
      },
    });

    if (!order) {
      throw new OrderError('Order not found', 404);
    }

    // Verify multi-tenant access
    if (caller.role !== UserRole.SUPER_ADMIN && order.organisationId !== caller.organisationId) {
      throw new OrderError('Forbidden: Cannot access orders belonging to another organisation', 403);
    }

    return formatOrder(order);
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
      throw new OrderError('Forbidden: Only platform administrators can transition order fulfillment status', 403);
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
    if (currentStatus === OrderStatus.CANCELLED) {
      throw new OrderError('Cannot update status of a cancelled order', 400);
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

    if (nextStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (nextStatus === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = data.cancellationReason?.trim() || 'Cancelled by distributor';
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: 'asc' },
        },
        organisation: true,
        createdBy: true,
      },
    });

    return formatOrder(updated);
  }

  /**
   * Cancel an order (Retailer while PENDING, or Super Admin before DELIVERED).
   */
  async cancelOrder(caller: AuthContext, id: string, reason?: string): Promise<Order> {
    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new OrderError('Order not found', 404);
    }

    const currentStatus = existing.status as OrderStatus;

    if (currentStatus === OrderStatus.CANCELLED) {
      throw new OrderError('Order is already cancelled', 400);
    }

    // Role specific cancellation rules
    if (caller.role !== UserRole.SUPER_ADMIN) {
      if (existing.organisationId !== caller.organisationId) {
        throw new OrderError('Forbidden: Cannot cancel orders belonging to another organisation', 403);
      }
      if (!isRetailerCancellable(currentStatus)) {
        throw new OrderError(
          `Retailers can only cancel orders while in PENDING status. Current status is "${currentStatus}". Please contact support to request cancellation.`,
          400,
        );
      }
    } else {
      if (!isDistributorCancellable(currentStatus)) {
        throw new OrderError(`Cannot cancel an order with status "${currentStatus}"`, 400);
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || (caller.role === UserRole.SUPER_ADMIN ? 'Cancelled by platform admin' : 'Cancelled by customer'),
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
      confirmedOrders,
      processingOrders,
      dispatchedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueResult,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.DISPATCHED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
      prisma.order.aggregate({
        where: { ...where, status: { not: OrderStatus.CANCELLED } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      dispatchedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: Number(revenueResult._sum.totalAmount || 0),
    };
  }
}

export const ordersService = new OrdersService();
