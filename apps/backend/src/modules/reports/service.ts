import { prisma } from '../../lib/prisma';
import {
  type AuthContext,
  UserRole,
  type CustomerOverallPurchaseHistory,
  type CustomerProductPurchaseHistory,
  type ProductPurchaseHistoryItem,
  type PurchaseHistoryItem,
} from '@ontime/shared';

export class ReportError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

export class ReportsService {
  /**
   * Get Overall Purchase History for a specific customer/organisation.
   */
  async getCustomerOverallPurchaseHistory(
    organisationId: string,
    caller: AuthContext,
  ): Promise<CustomerOverallPurchaseHistory> {
    if (caller.role !== UserRole.SUPER_ADMIN && caller.organisationId !== organisationId) {
      throw new ReportError('Forbidden: Cannot access reports for another organisation', 403);
    }

    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      throw new ReportError('Organisation not found', 404);
    }

    const orders = await prisma.order.findMany({
      where: { organisationId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const activeOrders = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED');
    const totalSpend = activeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const averageOrderValue =
      activeOrders.length > 0 ? Math.round((totalSpend / activeOrders.length) * 100) / 100 : 0;

    const firstOrderDate =
      orders.length > 0 && orders[orders.length - 1]
        ? orders[orders.length - 1]!.createdAt.toISOString()
        : null;
    const lastOrderDate =
      orders.length > 0 && orders[0] ? orders[0]!.createdAt.toISOString() : null;

    const formattedOrders: PurchaseHistoryItem[] = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt.toISOString(),
      totalAmount: Number(o.totalAmount),
      itemCount: o.items.reduce((sum, it) => sum + it.quantity, 0),
      status: o.status,
    }));

    return {
      organisationId: org.id,
      organisationName: org.name,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalOrders,
      averageOrderValue,
      firstOrderDate,
      lastOrderDate,
      orders: formattedOrders,
    };
  }

  /**
   * Get Product-wise Purchase History for a specific customer/organisation.
   */
  async getCustomerProductPurchaseHistory(
    organisationId: string,
    caller: AuthContext,
  ): Promise<CustomerProductPurchaseHistory> {
    if (caller.role !== UserRole.SUPER_ADMIN && caller.organisationId !== organisationId) {
      throw new ReportError('Forbidden: Cannot access reports for another organisation', 403);
    }

    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      throw new ReportError('Organisation not found', 404);
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          organisationId,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
      },
      include: {
        order: { select: { id: true, createdAt: true } },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        productSku: string;
        categoryName: string | null;
        totalQuantity: number;
        totalSpent: number;
        lastOrderedDate: Date;
        orderIds: Set<string>;
      }
    >();

    for (const item of orderItems) {
      const pid = item.productId;
      const existing = productMap.get(pid);
      const itemTotal = Number(item.totalPrice);
      const orderDate = item.order.createdAt;

      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalSpent += itemTotal;
        existing.orderIds.add(item.order.id);
        if (orderDate > existing.lastOrderedDate) {
          existing.lastOrderedDate = orderDate;
        }
      } else {
        productMap.set(pid, {
          productId: pid,
          productName: item.productName || item.product?.name || 'Unknown Product',
          productSku: item.productSku || item.product?.sku || 'N/A',
          categoryName: item.product?.category?.name ?? null,
          totalQuantity: item.quantity,
          totalSpent: itemTotal,
          lastOrderedDate: orderDate,
          orderIds: new Set([item.order.id]),
        });
      }
    }

    const products: ProductPurchaseHistoryItem[] = Array.from(productMap.values())
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        productSku: p.productSku,
        categoryName: p.categoryName,
        totalQuantity: p.totalQuantity,
        totalSpent: Math.round(p.totalSpent * 100) / 100,
        lastOrderedDate: p.lastOrderedDate.toISOString(),
        orderCount: p.orderIds.size,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      organisationId: org.id,
      organisationName: org.name,
      totalProductsCount: products.length,
      products,
    };
  }
}

export const reportsService = new ReportsService();
