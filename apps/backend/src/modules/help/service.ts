import {
  type HelpArticle,
  type HelpCategorySummary,
  SupportTopic,
} from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type HelpFilterQueryInput } from './validator';

export const DEFAULT_HELP_ARTICLES: Array<{
  category: SupportTopic;
  title: string;
  slug: string;
  summary: string;
  content: string;
  order: number;
}> = [
  {
    category: SupportTopic.ORDER_DELIVERY,
    title: 'How do I track my order delivery?',
    slug: 'track-order-delivery',
    summary: 'Learn how to monitor real-time order status from dispatch to doorstep delivery.',
    content: `You can track the progress of your orders directly from the Orders tab in your retailer portal or mobile app.
Each order transitions through statuses: Confirmed -> Processing -> Dispatched -> Delivered.
Once an order is dispatched, delivery details and estimated arrival times will update in real time.`,
    order: 1,
  },
  {
    category: SupportTopic.ORDER_DELIVERY,
    title: 'Cancellations and returns policy',
    slug: 'cancellations-returns-policy',
    summary: 'Guidelines on cancelling pending orders or requesting return of damaged items.',
    content: `Orders in 'PENDING' or 'AWAITING' status can be cancelled directly by the retailer.
For delivered orders with discrepancies, damages, or missing items, please contact support within 24 hours of delivery.`,
    order: 2,
  },
  {
    category: SupportTopic.PAYMENTS_BILLING,
    title: 'Accessing and downloading GST invoices',
    slug: 'download-invoices-tax-documents',
    summary: 'How to view and download tax invoices for your wholesale orders.',
    content: `Tax invoices are automatically generated when an order is dispatched.
You can view and download GST invoices from the order details screen in both PDF and print formats.`,
    order: 1,
  },
  {
    category: SupportTopic.PRODUCTS_STOCK,
    title: 'Product availability and variant pricing',
    slug: 'product-variants-and-pricing',
    summary: 'Understanding wholesale pricing tiers, package sizes, and real-time inventory availability.',
    content: `All prices listed in the catalog reflect distributor wholesale pricing exclusive of applicable taxes.
Variants (such as 500g, 1kg, bulk carton packs) carry specific unit pricing and packaging specifications shown on the product card.`,
    order: 1,
  },
  {
    category: SupportTopic.ACCOUNT_ACCESS,
    title: 'Managing staff permissions and multi-user access',
    slug: 'managing-staff-permissions',
    summary: 'How retailer admins can invite staff members and manage access roles.',
    content: `Retailer Admins can invite team members under Account -> Staff & Permissions.
Staff members can create and manage draft orders and view orders placed on behalf of your store.`,
    order: 1,
  },
  {
    category: SupportTopic.ACCOUNT_ACCESS,
    title: 'Two-step verification and account security',
    slug: 'two-step-verification-security',
    summary: 'Best practices for securing your retailer account and managing sign-in activity.',
    content: `Enable Two-Step Verification under Account -> Security for enhanced login protection.
You can also review active signed-in devices and change your password whenever needed.`,
    order: 2,
  },
];

export class HelpService {
  /**
   * Seed default help articles if none exist in the database.
   */
  private async ensureSeededArticles(): Promise<void> {
    const count = await prisma.helpArticle.count();
    if (count === 0) {
      for (const item of DEFAULT_HELP_ARTICLES) {
        await prisma.helpArticle.create({
          data: {
            ...item,
            isActive: true,
          },
        });
      }
    }
  }

  /**
   * Get categories list with article counts.
   */
  async getCategories(): Promise<HelpCategorySummary[]> {
    await this.ensureSeededArticles();

    const categoryDefinitions: Array<{
      id: SupportTopic;
      title: string;
      description: string;
    }> = [
      {
        id: SupportTopic.ORDER_DELIVERY,
        title: 'Order & delivery help',
        description: 'Tracking, delays, cancellations and returns',
      },
      {
        id: SupportTopic.PAYMENTS_BILLING,
        title: 'Payments & billing',
        description: 'Invoices, payment issues and tax documents',
      },
      {
        id: SupportTopic.PRODUCTS_STOCK,
        title: 'Products & stock',
        description: 'Availability, variants and pricing questions',
      },
      {
        id: SupportTopic.ACCOUNT_ACCESS,
        title: 'Account & access',
        description: 'Profile, password and login support',
      },
    ];

    const counts = await prisma.helpArticle.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c.category, c._count.id);
    }

    return categoryDefinitions.map((cat) => ({
      id: cat.id,
      title: cat.title,
      description: cat.description,
      articleCount: countMap.get(cat.id) || 0,
    }));
  }

  /**
   * List / search help articles.
   */
  async listArticles(filters?: HelpFilterQueryInput): Promise<HelpArticle[]> {
    await this.ensureSeededArticles();

    const where: any = { isActive: true };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const articles = await prisma.helpArticle.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return articles.map((a) => ({
      id: a.id,
      category: a.category as SupportTopic,
      title: a.title,
      slug: a.slug,
      summary: a.summary,
      content: a.content,
      order: a.order,
      isActive: a.isActive,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  /**
   * Get single article by ID or slug.
   */
  async getArticle(idOrSlug: string): Promise<HelpArticle | null> {
    await this.ensureSeededArticles();

    const article = await prisma.helpArticle.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
    });

    if (!article) return null;

    return {
      id: article.id,
      category: article.category as SupportTopic,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      order: article.order,
      isActive: article.isActive,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }
}

export const helpService = new HelpService();
