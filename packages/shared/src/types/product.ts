/**
 * Product & Category interfaces for the distributor catalog.
 */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

/**
 * Represents a variant of a product (e.g. weight, description, image, price).
 */
export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string | null;
  weight?: string | null;
  description?: string | null;
  image?: string | null;
  price: number;
  tier1Price?: number | null;
  tier2Price?: number | null;
  tier3Price?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating or updating a product variant.
 */
export interface ProductVariantDto {
  id?: string | undefined;
  sku?: string | undefined;
  weight?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
  price: number;
  tier1Price?: number | undefined;
  tier2Price?: number | undefined;
  tier3Price?: number | undefined;
}

/**
 * Represents a styled product tag with display colors.
 */
export interface ProductTag {
  name: string;
  textColor: string;
  backgroundColor: string;
  bgColor: string;
}

/**
 * Standard preset colors for common product tags.
 */
export const PRESET_TAG_COLORS: Record<string, { textColor: string; backgroundColor: string }> = {
  new: { textColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  'hot sale': { textColor: '#dc2626', backgroundColor: '#fef2f2' },
  hot: { textColor: '#dc2626', backgroundColor: '#fef2f2' },
  popular: { textColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  'best seller': { textColor: '#b45309', backgroundColor: '#fffbeb' },
  bestseller: { textColor: '#b45309', backgroundColor: '#fffbeb' },
  organic: { textColor: '#15803d', backgroundColor: '#f0fdf4' },
  featured: { textColor: '#0f766e', backgroundColor: '#f0fdfa' },
  sale: { textColor: '#c026d3', backgroundColor: '#fdf4ff' },
  discount: { textColor: '#c026d3', backgroundColor: '#fdf4ff' },
  limited: { textColor: '#ea580c', backgroundColor: '#fff7ed' },
  special: { textColor: '#ea580c', backgroundColor: '#fff7ed' },
  fresh: { textColor: '#059669', backgroundColor: '#ecfdf5' },
};

/**
 * Dynamic harmonious color palettes for custom tags.
 */
export const DYNAMIC_TAG_PALETTES = [
  { textColor: '#1d4ed8', backgroundColor: '#eff6ff' }, // Blue
  { textColor: '#047857', backgroundColor: '#ecfdf5' }, // Emerald
  { textColor: '#7c3aed', backgroundColor: '#f5f3ff' }, // Purple
  { textColor: '#c026d3', backgroundColor: '#fdf4ff' }, // Fuchsia
  { textColor: '#b45309', backgroundColor: '#fffbeb' }, // Amber
  { textColor: '#0e7490', backgroundColor: '#ecfeff' }, // Cyan
  { textColor: '#be123c', backgroundColor: '#fff1f2' }, // Rose
  { textColor: '#4338ca', backgroundColor: '#eef2ff' }, // Indigo
  { textColor: '#0f766e', backgroundColor: '#f0fdfa' }, // Teal
  { textColor: '#c2410c', backgroundColor: '#fff7ed' }, // Orange
];

/**
 * Resolves a tag into a ProductTag object with text and background colors.
 */
export function resolveProductTag(
  rawTag: string | { name: string; textColor?: string; backgroundColor?: string; bgColor?: string },
): ProductTag {
  if (typeof rawTag === 'string') {
    const trimmed = rawTag.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
          return resolveProductTag(parsed);
        }
      } catch {
        // Fall back to plain string
      }
    }
  }

  const name = typeof rawTag === 'string' ? rawTag.trim() : (rawTag?.name || '').trim();
  if (
    typeof rawTag === 'object' &&
    rawTag !== null &&
    rawTag.textColor &&
    (rawTag.backgroundColor || rawTag.bgColor)
  ) {
    const bg = rawTag.backgroundColor || rawTag.bgColor || '#eff6ff';
    return {
      name,
      textColor: rawTag.textColor,
      backgroundColor: bg,
      bgColor: bg,
    };
  }

  const key = name.toLowerCase();
  const preset = PRESET_TAG_COLORS[key];
  if (preset) {
    return {
      name,
      textColor: preset.textColor,
      backgroundColor: preset.backgroundColor,
      bgColor: preset.backgroundColor,
    };
  }

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const paletteIndex = Math.abs(hash) % DYNAMIC_TAG_PALETTES.length;
  const palette = DYNAMIC_TAG_PALETTES[paletteIndex] ?? {
    textColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  };
  return {
    name,
    textColor: palette.textColor,
    backgroundColor: palette.backgroundColor,
    bgColor: palette.backgroundColor,
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  tier1Price?: number | null;
  tier2Price?: number | null;
  tier3Price?: number | null;
  noVat?: boolean;
  taxRate?: number;
  tags?: ProductTag[];
  categoryId?: string | null;
  category?: Category | null;
  unit: string;
  isActive: boolean;
  images: string[];
  packagingNote?: string | null;
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string | null | undefined;
  price: number;
  tier1Price?: number | undefined;
  tier2Price?: number | undefined;
  tier3Price?: number | undefined;
  noVat?: boolean | undefined;
  taxRate?: number | undefined;
  tags?: Array<string | ProductTag> | undefined;
  categoryId?: string | undefined;
  unit?: string | undefined;
  isActive?: boolean | undefined;
  images?: string[] | undefined;
  packagingNote?: string | null | undefined;
  variants?: ProductVariantDto[] | undefined;
  variant?: ProductVariantDto | undefined;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  images?: string[] | undefined;
  packagingNote?: string | null | undefined;
  variants?: ProductVariantDto[] | undefined;
  variant?: ProductVariantDto | undefined;
}

export interface CategoryFilterParams {
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ProductFilterParams {
  search?: string | undefined;
  q?: string | undefined;
  id?: string | undefined;
  name?: string | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  unit?: string | undefined;
  packagingNote?: string | undefined;
  categoryName?: string | undefined;
  categoryId?: string | undefined;
  price?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  noVat?: boolean | undefined;
  tag?: string | undefined;
  isActive?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export type ProductSearchParams = ProductFilterParams;
