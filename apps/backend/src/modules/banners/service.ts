import { prisma } from '../../lib/prisma';
import { type Banner, type CreateBannerDto, type UpdateBannerDto } from '@ontime/shared';

export class BannerError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BannerError';
  }
}

export class BannersService {
  private formatBanner(b: any): Banner {
    return {
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? null,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? null,
      displayOrder: b.displayOrder,
      isActive: b.isActive,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  /**
   * List banners. When activeOnly is true, only returns active banners ordered by displayOrder.
   */
  async listBanners(activeOnly = false): Promise<Banner[]> {
    const where = activeOnly ? { isActive: true } : {};
    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return banners.map((b) => this.formatBanner(b));
  }

  /**
   * Get banner by ID.
   */
  async getBannerById(id: string): Promise<Banner> {
    const banner = await prisma.banner.findUnique({
      where: { id },
    });
    if (!banner) {
      throw new BannerError('Banner not found', 404);
    }
    return this.formatBanner(banner);
  }

  /**
   * Create a new banner.
   */
  async createBanner(data: CreateBannerDto): Promise<Banner> {
    const banner = await prisma.banner.create({
      data: {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        imageUrl: data.imageUrl.trim(),
        linkUrl: data.linkUrl?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
    return this.formatBanner(banner);
  }

  /**
   * Update an existing banner.
   */
  async updateBanner(id: string, data: UpdateBannerDto): Promise<Banner> {
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new BannerError('Banner not found', 404);
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle?.trim() || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl.trim();
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl?.trim() || null;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.banner.update({
      where: { id },
      data: updateData,
    });
    return this.formatBanner(updated);
  }

  /**
   * Delete banner.
   */
  async deleteBanner(id: string): Promise<void> {
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new BannerError('Banner not found', 404);
    }
    await prisma.banner.delete({ where: { id } });
  }

  /**
   * Reorder banners.
   */
  async reorderBanners(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.banner.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );
  }
}

export const bannersService = new BannersService();

