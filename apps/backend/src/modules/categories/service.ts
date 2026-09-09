import { prisma } from '../../lib/prisma';
import { type Category } from '@ontime/shared';
import { type CreateCategoryInput, type UpdateCategoryInput } from './validator';

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

export class CategoriesService {
  /**
   * List all categories with product counts.
   */
  async listCategories(): Promise<CategoryWithCount[]> {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      productCount: cat._count.products,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
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
