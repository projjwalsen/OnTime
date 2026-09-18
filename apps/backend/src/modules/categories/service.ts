import { prisma } from '../../lib/prisma';
import { type Category, type PaginationMeta } from '@ontime/shared';
import {
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CategoryFilterInput,
} from './validator';

export class CategoryError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'CategoryError';
  }
}

export interface CategoryWithCount extends Category {
  productCount: number;
}

export interface ListCategoriesResult {
  categories: CategoryWithCount[];
  pagination: PaginationMeta;
}

export class CategoriesService {
  /**
   * List categories with product counts, search, and pagination.
   */
  async listCategories(filters?: CategoryFilterInput): Promise<ListCategoriesResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
        },
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        productCount: cat._count.products,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get category by ID with associated products.
   */
  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      products: category.products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: Number(p.price),
        categoryId: p.categoryId,
        unit: p.unit,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Create category (Distributor only).
   */
  async createCategory(data: CreateCategoryInput): Promise<Category> {
    const name = data.name.trim();

    // Check name uniqueness
    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      throw new CategoryError(`A category with name "${name}" already exists.`, 409);
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: data.description?.trim() || null,
      },
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Update category (Distributor only).
   */
  async updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> {
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new CategoryError('Category not found.', 404);
    }

    if (data.name && data.name.trim() !== existing.name) {
      const nameConflict = await prisma.category.findUnique({
        where: { name: data.name.trim() },
      });
      if (nameConflict) {
        throw new CategoryError(`A category with name "${data.name.trim()}" already exists.`, 409);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
      },
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Delete category (Distributor only).
   */
  async deleteCategory(id: string): Promise<void> {
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new CategoryError('Category not found.', 404);
    }

    // Unlink any products currently in this category
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.category.delete({
      where: { id },
    });
  }
}

export const categoriesService = new CategoriesService();
