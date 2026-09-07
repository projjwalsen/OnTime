import { type CreateProductInput, type UpdateProductInput } from './validator';

export interface ProductDto {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  categoryId?: string | null;
  unit: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductsService {
  /**
   * List products catalog.
   */
  async listProducts(): Promise<ProductDto[]> {
    // Scaffold implementation ready for Prisma Product model integration
    return [];
  }

  /**
   * Get product by ID.
   */
  async getProductById(_id: string): Promise<ProductDto | null> {
    return null;
  }

  /**
   * Create product (Distributor only).
   */
  async createProduct(data: CreateProductInput): Promise<ProductDto> {
    return {
      id: 'prod_' + Date.now(),
      name: data.name,
      sku: data.sku,
      description: data.description || null,
      price: data.price,
      categoryId: data.categoryId || null,
      unit: data.unit,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update product.
   */
  async updateProduct(id: string, data: UpdateProductInput): Promise<ProductDto> {
    return {
      id,
      name: data.name || 'Updated Product',
      sku: data.sku || 'SKU-001',
      description: data.description || null,
      price: data.price || 0,
      categoryId: data.categoryId || null,
      unit: data.unit || 'piece',
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export const productsService = new ProductsService();
