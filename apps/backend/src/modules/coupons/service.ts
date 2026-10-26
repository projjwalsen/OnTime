import { prisma } from '../../lib/prisma';
import { emailService } from '../../lib/email.service';
import { type Coupon, type PaginationMeta, DiscountType, type AuthContext } from '@ontime/shared';

export class CouponError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'CouponError';
  }
}

export interface CouponFilterInput {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  isActive?: boolean | undefined;
  organisationId?: string | undefined;
  userId?: string | undefined;
}

export interface ListCouponsResult {
  coupons: Coupon[];
  pagination: PaginationMeta;
}

export class CouponsService {
  /**
   * Helper to format Prisma coupon into Coupon interface
   */
  private formatCoupon(c: any): Coupon {
    return {
      id: c.id,
      code: c.code,
      description: c.description ?? null,
      discountType: c.discountType as DiscountType,
      discountValue: Number(c.discountValue),
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      usageLimit: c.usageLimit ?? 1,
      usedCount: c.usedCount ?? 0,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      isActive: c.isActive,
      organisationId: c.organisationId ?? null,
      organisationName: c.organisation?.name ?? null,
      userId: c.userId ?? null,
      userName: c.user?.name ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  /**
   * List coupons with filters and pagination.
   */
  async listCoupons(filters?: CouponFilterInput): Promise<ListCouponsResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.organisationId) {
      where.organisationId = filters.organisationId;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.search && filters.search.trim()) {
      const search = filters.search.trim().toUpperCase();
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        include: {
          organisation: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      coupons: records.map((r) => this.formatCoupon(r)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get coupon by ID.
   */
  async getCouponById(id: string): Promise<Coupon> {
    const c = await prisma.coupon.findUnique({
      where: { id },
      include: {
        organisation: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!c) {
      throw new CouponError('Coupon not found', 404);
    }

    return this.formatCoupon(c);
  }

  /**
   * Create a new coupon and optionally dispatch email to recipient.
   */
  async createCoupon(data: {
    code: string;
    description?: string | null | undefined;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount?: number | null | undefined;
    maxDiscount?: number | null | undefined;
    usageLimit?: number | undefined;
    expiresAt?: string | null | undefined;
    isActive?: boolean | undefined;
    organisationId?: string | null | undefined;
    userId?: string | null | undefined;
    sendEmailToCustomer?: boolean | undefined;
  }): Promise<Coupon> {
    const code = data.code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      throw new CouponError(`Coupon code "${code}" already exists`, 409);
    }

    let targetEmail: string | null = null;
    let recipientName = 'Valued Customer';

    if (data.userId) {
      const user = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) throw new CouponError('Specified user does not exist', 400);
      targetEmail = user.email;
      recipientName = user.name;
    } else if (data.organisationId) {
      const org = await prisma.organisation.findUnique({
        where: { id: data.organisationId },
        include: { users: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      if (!org) throw new CouponError('Specified organisation does not exist', 400);
      targetEmail = org.email || org.users[0]?.email || null;
      recipientName = org.name;
    }

    const created = await prisma.coupon.create({
      data: {
        code,
        description: data.description?.trim() || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? 1,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
        organisationId: data.organisationId || null,
        userId: data.userId || null,
      },
      include: {
        organisation: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Automatic email dispatch if requested and recipient has an email address
    if (data.sendEmailToCustomer && targetEmail) {
      const discountLabel =
        data.discountType === DiscountType.PERCENTAGE
          ? `${data.discountValue}% OFF`
          : `$${data.discountValue} OFF`;

      const expiryText = data.expiresAt
        ? `Valid until ${new Date(data.expiresAt).toLocaleDateString()}.`
        : 'No expiration date.';

      const minOrderText = data.minOrderAmount
        ? `Minimum order value: $${data.minOrderAmount}.`
        : '';

      emailService.sendCustomEmail(
        targetEmail,
        `Special Discount Coupon: ${code} (${discountLabel})`,
        'Exclusive Discount Coupon',
        `
          <p>Hi ${recipientName},</p>
          <p>We are delighted to offer you an exclusive discount on your next order!</p>
          <div style="background-color: #f1f5f9; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <div style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Use Promo Code</div>
            <div style="font-size: 26px; font-weight: 800; color: #1d4ed8; letter-spacing: 2px; margin: 6px 0;">${code}</div>
            <div style="font-size: 16px; font-weight: 600; color: #0f172a;">${discountLabel}</div>
          </div>
          <p style="font-size: 14px; color: #475569;">${expiryText} ${minOrderText}</p>
          <p style="font-size: 14px; color: #475569;">Simply apply this coupon code at checkout to claim your savings.</p>
        `,
        `Hi ${recipientName},\n\nYou have received a discount coupon: ${code} for ${discountLabel}!\n${expiryText} ${minOrderText}\nApply at checkout to redeem.`,
      ).catch((err) => {
        console.error('Failed to send coupon email:', err);
      });
    }

    return this.formatCoupon(created);
  }

  /**
   * Update an existing coupon.
   */
  async updateCoupon(
    id: string,
    data: {
      description?: string | null | undefined;
      discountType?: DiscountType | undefined;
      discountValue?: number | undefined;
      minOrderAmount?: number | null | undefined;
      maxDiscount?: number | null | undefined;
      usageLimit?: number | undefined;
      expiresAt?: string | null | undefined;
      isActive?: boolean | undefined;
      organisationId?: string | null | undefined;
      userId?: string | null | undefined;
    },
  ): Promise<Coupon> {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new CouponError('Coupon not found', 404);
    }

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount;
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.organisationId !== undefined) updateData.organisationId = data.organisationId || null;
    if (data.userId !== undefined) updateData.userId = data.userId || null;

    const updated = await prisma.coupon.update({
      where: { id },
      data: updateData,
      include: {
        organisation: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatCoupon(updated);
  }

  /**
   * Delete coupon.
   */
  async deleteCoupon(id: string): Promise<void> {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new CouponError('Coupon not found', 404);
    }
    await prisma.coupon.delete({ where: { id } });
  }

  /**
   * Validate coupon and calculate discount against order amount and caller identity.
   */
  async validateCoupon(
    code: string,
    orderAmount: number,
    caller?: AuthContext,
  ): Promise<{ valid: boolean; discountAmount: number; coupon: Coupon; message?: string }> {
    const cleanCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
      include: {
        organisation: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new CouponError('Invalid or inactive coupon code', 400);
    }

    // Expiration check
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new CouponError('This coupon has expired', 400);
    }

    // Usage limit check
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new CouponError('This coupon has reached its maximum redemption limit', 400);
    }

    // Organisation scoping check
    if (coupon.organisationId && caller?.organisationId && coupon.organisationId !== caller.organisationId) {
      throw new CouponError('This coupon is not valid for your organisation', 403);
    }

    // User scoping check
    if (coupon.userId && caller?.userId && coupon.userId !== caller.userId) {
      throw new CouponError('This coupon is restricted to a different customer account', 403);
    }

    // Minimum order amount check
    const minOrder = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (minOrder > 0 && orderAmount < minOrder) {
      throw new CouponError(`Order minimum of $${minOrder.toFixed(2)} is required for this coupon`, 400);
    }

    // Compute discount
    let discount = 0;
    const value = Number(coupon.discountValue);

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (orderAmount * value) / 100;
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else {
      discount = Math.min(value, orderAmount);
    }

    discount = Math.round(discount * 100) / 100;

    return {
      valid: true,
      discountAmount: discount,
      coupon: this.formatCoupon(coupon),
      message: 'Coupon applied successfully',
    };
  }

  /**
   * Increment used count when order is placed.
   */
  async incrementUsage(couponId: string): Promise<void> {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }
}

export const couponsService = new CouponsService();
