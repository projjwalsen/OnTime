/**
 * Product & Category interfaces for the distributor catalog.
 */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

/**
 * Represents a variant of a product (e.g. weight, description, image, price).
 */
export interface ProductVariant {
  id: string;
  productId: string;
  weight?: string | null;
  description?: string | null;
  image?: string | null;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating or updating a product variant.
 */
export interface ProductVariantDto {
  id?: string | undefined;
  weight?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  categoryId?: string | null;
  category?: Category | null;
  unit: string;
  isActive: boolean;
  images: string[];
  packagingNote?: string | null;
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string | null | undefined;
  price: number;
  categoryId?: string | undefined;
  unit?: string | undefined;
  isActive?: boolean | undefined;
  images?: string[] | undefined;
  packagingNote?: string | null | undefined;
  variants?: ProductVariantDto[] | undefined;
  variant?: ProductVariantDto | undefined;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  images?: string[] | undefined;
  packagingNote?: string | null | undefined;
  variants?: ProductVariantDto[] | undefined;
  variant?: ProductVariantDto | undefined;
}

export interface CategoryFilterParams {
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ProductFilterParams {
  search?: string | undefined;
  categoryId?: string | undefined;
  isActive?: boolean | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}
