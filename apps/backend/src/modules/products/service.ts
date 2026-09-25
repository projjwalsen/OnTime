import { prisma } from '../../lib/prisma';
import {
  type Product,
  type ProductVariant,
  type PaginationMeta,
  type AuthContext,
  OrderStatus,
} from '@ontime/shared';
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
   * List or search products in catalog with multi-field search, filtering, and pagination.
   */
  async listProducts(filters?: ProductFilterInput): Promise<ListProductsResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    const andConditions: any[] = [];

    // 1. Global search across product name, sku, id, description, unit, packaging note, category, variants, and price
    const searchTerm = (filters?.search || filters?.q)?.trim();
    if (searchTerm) {
      const orConditions: any[] = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { unit: { contains: searchTerm, mode: 'insensitive' } },
        { packagingNote: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { category: { description: { contains: searchTerm, mode: 'insensitive' } } },
        {
          variants: {
            some: {
              OR: [
                { weight: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];

      const numericVal = Number(searchTerm);
      if (!isNaN(numericVal) && numericVal > 0) {
        orConditions.push({ price: numericVal });
        orConditions.push({
          variants: {
            some: {
              price: numericVal,
            },
          },
        });
      }

      andConditions.push({ OR: orConditions });
    }

    // 2. Field-specific optional filters
    if (filters?.id && filters.id.trim()) {
      andConditions.push({ id: { contains: filters.id.trim(), mode: 'insensitive' } });
    }

    if (filters?.name && filters.name.trim()) {
      andConditions.push({ name: { contains: filters.name.trim(), mode: 'insensitive' } });
    }

    if (filters?.sku && filters.sku.trim()) {
      andConditions.push({ sku: { contains: filters.sku.trim(), mode: 'insensitive' } });
    }

    if (filters?.description && filters.description.trim()) {
      andConditions.push({
        description: { contains: filters.description.trim(), mode: 'insensitive' },
      });
    }

    if (filters?.unit && filters.unit.trim()) {
      andConditions.push({ unit: { contains: filters.unit.trim(), mode: 'insensitive' } });
    }

    if (filters?.packagingNote && filters.packagingNote.trim()) {
      andConditions.push({
        packagingNote: { contains: filters.packagingNote.trim(), mode: 'insensitive' },
      });
    }

    if (filters?.categoryName && filters.categoryName.trim()) {
      andConditions.push({
        category: {
          name: { contains: filters.categoryName.trim(), mode: 'insensitive' },
        },
      });
    }

    if (filters?.categoryId && filters.categoryId.trim()) {
      andConditions.push({ categoryId: filters.categoryId.trim() });
    }

    if (filters?.isActive !== undefined) {
      andConditions.push({ isActive: filters.isActive });
    }

    if (filters?.price !== undefined) {
      andConditions.push({ price: filters.price });
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      const priceFilter: any = {};
      if (filters.minPrice !== undefined) {
        priceFilter.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        priceFilter.lte = filters.maxPrice;
      }
      andConditions.push({ price: priceFilter });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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
   * Global search for products (alias for listProducts with search parameters).
   */
  async searchProducts(filters?: ProductFilterInput): Promise<ListProductsResult> {
    return this.listProducts(filters);
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

  /**
   * Get recently purchased products for the authenticated organisation or user.
   */
  async getRecentPurchases(
    authContext: AuthContext,
    filters?: ProductFilterInput,
  ): Promise<ListProductsResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    // Filter orders by organisation if present (for retailer users), otherwise for super admin across all orders
    const orderWhere: any = {
      status: {
        notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
      },
    };

    if (authContext.organisationId) {
      orderWhere.organisationId = authContext.organisationId;
    }

    // Build product filter conditions if search/filters provided
    const productWhere: any = {};
    const andConditions: any[] = [];

    if (filters?.isActive !== undefined) {
      andConditions.push({ isActive: filters.isActive });
    } else {
      andConditions.push({ isActive: true });
    }

    const searchTerm = (filters?.search || filters?.q)?.trim();
    if (searchTerm) {
      const orConditions: any[] = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { unit: { contains: searchTerm, mode: 'insensitive' } },
        { packagingNote: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { category: { description: { contains: searchTerm, mode: 'insensitive' } } },
        {
          variants: {
            some: {
              OR: [
                { weight: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];

      const numericVal = Number(searchTerm);
      if (!isNaN(numericVal) && numericVal > 0) {
        orConditions.push({ price: numericVal });
        orConditions.push({
          variants: {
            some: {
              price: numericVal,
            },
          },
        });
      }

      andConditions.push({ OR: orConditions });
    }

    if (filters?.id && filters.id.trim()) {
      andConditions.push({ id: { contains: filters.id.trim(), mode: 'insensitive' } });
    }

    if (filters?.name && filters.name.trim()) {
      andConditions.push({ name: { contains: filters.name.trim(), mode: 'insensitive' } });
    }

    if (filters?.sku && filters.sku.trim()) {
      andConditions.push({ sku: { contains: filters.sku.trim(), mode: 'insensitive' } });
    }

    if (filters?.description && filters.description.trim()) {
      andConditions.push({
        description: { contains: filters.description.trim(), mode: 'insensitive' },
      });
    }

    if (filters?.unit && filters.unit.trim()) {
      andConditions.push({ unit: { contains: filters.unit.trim(), mode: 'insensitive' } });
    }

    if (filters?.packagingNote && filters.packagingNote.trim()) {
      andConditions.push({
        packagingNote: { contains: filters.packagingNote.trim(), mode: 'insensitive' },
      });
    }

    if (filters?.categoryName && filters.categoryName.trim()) {
      andConditions.push({
        category: {
          name: { contains: filters.categoryName.trim(), mode: 'insensitive' },
        },
      });
    }

    if (filters?.categoryId && filters.categoryId.trim()) {
      andConditions.push({ categoryId: filters.categoryId.trim() });
    }

    if (filters?.price !== undefined) {
      andConditions.push({ price: filters.price });
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      const priceFilter: any = {};
      if (filters.minPrice !== undefined) {
        priceFilter.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        priceFilter.lte = filters.maxPrice;
      }
      andConditions.push({ price: priceFilter });
    }

    if (andConditions.length > 0) {
      productWhere.AND = andConditions;
    }

    // Fetch recent order items ordered by order creation date descending
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: orderWhere,
        product: productWhere,
      },
      orderBy: [
        { order: { createdAt: 'desc' } },
        { createdAt: 'desc' },
      ],
      select: {
        productId: true,
      },
      take: 2000,
    });

    // Deduplicate product IDs while preserving the most recent purchase order
    const seenProductIds = new Set<string>();
    const uniqueProductIds: string[] = [];

    for (const item of orderItems) {
      if (item.productId && !seenProductIds.has(item.productId)) {
        seenProductIds.add(item.productId);
        uniqueProductIds.push(item.productId);
      }
    }

    const total = uniqueProductIds.length;
    const pageProductIds = uniqueProductIds.slice(skip, skip + limit);

    if (pageProductIds.length === 0) {
      return {
        products: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // Fetch full product details for the paginated product IDs
    const products = await prisma.product.findMany({
      where: {
        id: { in: pageProductIds },
      },
      include: {
        category: true,
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Restore the recency order since SQL `IN` does not guarantee order
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderedProducts = pageProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map(formatProduct);

    return {
      products: orderedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const productsService = new ProductsService();
