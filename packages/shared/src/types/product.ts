/**
 * Product & Category interfaces for the distributor catalog.
 */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  price: number;
  categoryId?: string;
  unit?: string;
  isActive?: boolean;
}

export type UpdateProductDto = Partial<CreateProductDto>;
