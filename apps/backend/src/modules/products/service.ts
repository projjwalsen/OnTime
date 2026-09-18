import { prisma } from '../../lib/prisma';
import { type Product, type ProductVariant, type PaginationMeta } from '@ontime/shared';
import {
  type CreateProductInput,
  type UpdateProductInput,
  type ProductFilterInput,
} from './validator';

export class ProductError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ProductError';
  }
}

export interface ListProductsResult {
  products: Product[];
  pagination: PaginationMeta;
}

function formatProduct(p: {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: any;
  categoryId: string | null;
  unit: string;
  isActive: boolean;
  images?: string[];
  packagingNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  variants?: Array<{
    id: string;
    productId: string;
    weight: string | null;
    description: string | null;
    image: string | null;
    price: any;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): Product {
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
    images: p.images ?? [],
    packagingNote: p.packagingNote ?? null,
    variants:
      p.variants?.map((v): ProductVariant => ({
        id: v.id,
        productId: v.productId,
        weight: v.weight,
        description: v.description,
        image: v.image,
        price: Number(v.price),
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })) ?? [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export class ProductsService {
  /**
   * List products in catalog with search, filtering, and pagination.
   */
  async listProducts(filters?: ProductFilterInput): Promise<ListProductsResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { packagingNote: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: {
            orderBy: { createdAt: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      products: products.map(formatProduct),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get product by ID.
   */
  async getProductById(id: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!p) return null;

    return formatProduct(p);
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

    const rawVariants = data.variants ?? (data.variant ? [data.variant] : undefined);

    const p = await prisma.product.create({
      data: {
        name: data.name.trim(),
        sku,
        description: data.description?.trim() || null,
        price: data.price,
        categoryId: data.categoryId || null,
        unit: data.unit || 'piece',
        isActive: data.isActive ?? true,
        images: data.images ?? [],
        packagingNote: data.packagingNote?.trim() || null,
        ...(rawVariants && rawVariants.length > 0
          ? {
              variants: {
                create: rawVariants.map((v) => ({
                  weight: v.weight?.trim() || null,
                  description: v.description?.trim() || null,
                  image: v.image?.trim() || null,
                  price: v.price,
                })),
              },
            }
          : {}),
      },
      include: {
        category: true,
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return formatProduct(p);
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

    const rawVariants = data.variants ?? (data.variant ? [data.variant] : undefined);

    const p = await prisma.$transaction(async (tx) => {
      if (rawVariants !== undefined) {
        // Replace existing variants
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });

        if (rawVariants.length > 0) {
          await tx.productVariant.createMany({
            data: rawVariants.map((v) => ({
              productId: id,
              weight: v.weight?.trim() || null,
              description: v.description?.trim() || null,
              image: v.image?.trim() || null,
              price: v.price,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.sku && { sku: data.sku.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
          ...(data.unit && { unit: data.unit }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.images !== undefined && { images: data.images }),
          ...(data.packagingNote !== undefined && {
            packagingNote: data.packagingNote?.trim() || null,
          }),
        },
        include: {
          category: true,
          variants: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return formatProduct(p);
  }
}

export const productsService = new ProductsService();
