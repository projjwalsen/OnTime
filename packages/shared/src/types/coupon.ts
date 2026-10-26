export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  usageLimit: number;
  usedCount: number;
  expiresAt?: Date | string | null;
  isActive: boolean;
  organisationId?: string | null;
  organisationName?: string | null;
  userId?: string | null;
  userName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCouponDto {
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
}

export interface UpdateCouponDto {
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
}

export interface ValidateCouponDto {
  code: string;
  orderAmount: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  discountAmount: number;
  coupon: Coupon;
  message?: string;
}
