export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBannerDto {
  title: string;
  subtitle?: string | null | undefined;
  imageUrl: string;
  linkUrl?: string | null | undefined;
  displayOrder?: number | undefined;
  isActive?: boolean | undefined;
}

export interface UpdateBannerDto {
  title?: string | undefined;
  subtitle?: string | null | undefined;
  imageUrl?: string | undefined;
  linkUrl?: string | null | undefined;
  displayOrder?: number | undefined;
  isActive?: boolean | undefined;
}
