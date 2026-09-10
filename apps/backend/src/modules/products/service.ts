import { prisma } from '../../lib/prisma';
import { type Product } from '@ontime/shared';
import { type CreateProductInput, type UpdateProductInput } from './validator';

export class ProductError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ProductError';
  }
}

export class ProductsService {
  /**
   * List all products in catalog.
   */
  async listProducts(): Promise<Product[]> {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
            description: p.category.description,
            createdAt: p.category.createdAt,
            updatedAt: p.category.updatedAt,
          }
        : null,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Get product by ID.
   */
  async getProductById(id: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
            description: p.category.description,
            createdAt: p.category.createdAt,
            updatedAt: p.category.updatedAt,
          }
        : null,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  /**
   * Create product (Distributor only).
   */
  async createProduct(data: CreateProductInput): Promise<Product> {
    const sku = data.sku.trim();

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      throw new ProductError(`A product with SKU "${sku}" already exists.`, 409);
    }

    // If categoryId provided, verify it exists
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new ProductError(`Category with ID "${data.categoryId}" not found.`, 404);
      }
    }

    const p = await prisma.product.create({
      data: {
        name: data.name.trim(),
        sku,
        description: data.description?.trim() || null,
        price: data.price,
        categoryId: data.categoryId || null,
        unit: data.unit || 'piece',
        isActive: data.isActive ?? true,
      },
      include: {
        category: true,
      },
    });

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
            description: p.category.description,
            createdAt: p.category.createdAt,
            updatedAt: p.category.updatedAt,
          }
        : null,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  /**
   * Update product.
   */
  async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ProductError('Product not found.', 404);
    }

    if (data.sku && data.sku.trim() !== existing.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku.trim() },
      });
      if (existingSku) {
        throw new ProductError(`A product with SKU "${data.sku.trim()}" already exists.`, 409);
      }
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new ProductError(`Category with ID "${data.categoryId}" not found.`, 404);
      }
    }

    const p = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.sku && { sku: data.sku.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
        ...(data.unit && { unit: data.unit }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        category: true,
      },
    });

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
            description: p.category.description,
            createdAt: p.category.createdAt,
            updatedAt: p.category.updatedAt,
          }
        : null,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}

export const productsService = new ProductsService();
