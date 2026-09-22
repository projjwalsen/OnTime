import { SupportTopic } from './support';

export interface HelpCategorySummary {
  id: SupportTopic;
  title: string;
  description: string;
  articleCount: number;
}

export interface HelpArticle {
  id: string;
  category: SupportTopic;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  order: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface HelpArticleFilterParams {
  category?: SupportTopic;
  search?: string;
}
