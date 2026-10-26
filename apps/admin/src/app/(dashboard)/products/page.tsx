'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Tag,
  Layers,
  UploadCloud,
  Image as ImageIcon,
  X,
  Star,
  FileText,
  Upload,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { getMediaUrl } from '../../../lib/config';
import {
  Product,
  Category,
  CreateProductDto,
  UpdateProductDto,
  ProductVariantDto,
} from '@ontime/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { Pagination } from '../../../components/ui/Pagination';

interface VariantFormItem {
  id?: string;
  sku?: string;
  weight: string;
  description: string;
  image: string;
  price: string;
  tier1Price?: string;
  tier2Price?: string;
  tier3Price?: string;
}

function ProductThumbnail({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);
  const resolvedSrc = src ? getMediaUrl(src) : null;

  if (!resolvedSrc || hasError) {
    return <Package size={22} color="#94a3b8" />;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      onError={() => {
        console.warn(`[Thumbnail] Failed to load image: ${resolvedSrc}`);
        setHasError(true);
      }}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      loading="lazy"
    />
  );
}

export default function ProductsPage() {
  const { success, error: toastError } = useToast();

  const [products, setProducts] = useState<(Product & { category?: Category | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Image Upload State
  const [uploadingImages, setUploadingImages] = useState(false);
  const [variantUploadingIndex, setVariantUploadingIndex] = useState<number | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    price: '',
    tier1Price: '',
    tier2Price: '',
    tier3Price: '',
    noVat: false,
    tags: [] as string[],
    unit: '1 kg',
    isActive: true,
    images: [] as string[],
    packagingNote: '',
    variants: [] as VariantFormItem[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        api.getProducts({
          page,
          limit,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(categoryFilter ? { categoryId: categoryFilter } : {}),
        }),
        api.getCategories(),
      ]);

      if (prodsRes.success && prodsRes.data) {
        setProducts(prodsRes.data.products);
        setTotalPages(prodsRes.data.pagination?.totalPages || 1);
        setTotalCount(prodsRes.data.pagination?.total || 0);
      }
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data.categories);
      }
    } catch {
      toastError('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter, toastError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleOpenCreate = () => {
    setFormData({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      price: '50.00',
      tier1Price: '50.00',
      tier2Price: '',
      tier3Price: '',
      noVat: false,
      tags: [],
      unit: '1 kg',
      isActive: true,
      images: [],
      packagingNote: '',
      variants: [],
    });
    setManualImageUrl('');
    setShowManualUrlInput(false);
    setTagInput('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
      price: product.price.toString(),
      tier1Price: product.tier1Price ? product.tier1Price.toString() : product.price.toString(),
      tier2Price: product.tier2Price ? product.tier2Price.toString() : '',
      tier3Price: product.tier3Price ? product.tier3Price.toString() : '',
      noVat: !!product.noVat,
      tags: product.tags ? [...product.tags] : [],
      unit: product.unit,
      isActive: product.isActive,
      images: product.images ? [...product.images] : [],
      packagingNote: product.packagingNote || '',
      variants:
        product.variants?.map((v) => ({
          id: v.id,
          sku: v.sku || '',
          weight: v.weight || '',
          description: v.description || '',
          image: v.image || '',
          price: v.price.toString(),
          tier1Price: v.tier1Price ? v.tier1Price.toString() : v.price.toString(),
          tier2Price: v.tier2Price ? v.tier2Price.toString() : '',
          tier3Price: v.tier3Price ? v.tier3Price.toString() : '',
        })) || [],
    });
    setManualImageUrl('');
    setShowManualUrlInput(false);
    setTagInput('');
    setIsEditOpen(true);
  };

  // Image Upload Handlers
  const handleImageFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const res = await api.uploadMedia(files);
      if (res.success && res.data?.files) {
        const newUrls = res.data.files.map((f) => f.url);
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...newUrls],
        }));
        success(
          `Uploaded ${res.data.files.length} ${
            res.data.files.length === 1 ? 'image' : 'images'
          } to server storage!`,
        );
      } else {
        toastError(res.error || 'Failed to upload images');
      }
    } catch {
      toastError('Image upload failed. Check connection or file size.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddManualImageUrl = () => {
    if (!manualImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, manualImageUrl.trim()],
    }));
    setManualImageUrl('');
    setShowManualUrlInput(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const images = [...prev.images];
      const selected = images.splice(index, 1)[0];
      if (selected) images.unshift(selected);
      return { ...prev, images };
    });
  };

  const handleVariantImageUpload = async (index: number, file: File) => {
    setVariantUploadingIndex(index);
    try {
      const res = await api.uploadSingleMedia(file);
      if (res.success && res.data?.url) {
        handleVariantChange(index, 'image', res.data.url);
        success('Variant image uploaded!');
      } else {
        toastError(res.error || 'Failed to upload variant image');
      }
    } catch {
      toastError('Failed to upload variant image');
    } finally {
      setVariantUploadingIndex(null);
    }
  };

  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          sku: `${prev.sku}-V${prev.variants.length + 1}`,
          weight: '',
          description: '',
          image: '',
          price: prev.price || '0.00',
          tier1Price: prev.tier1Price || prev.price || '0.00',
          tier2Price: prev.tier2Price || '',
          tier3Price: prev.tier3Price || '',
        },
      ],
    }));
  };

  const handleRemoveVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleVariantChange = (index: number, field: keyof VariantFormItem, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index]!, [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleAddCustomTag = () => {
    if (!tagInput.trim()) return;
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !formData.tags.includes(t));
    if (newTags.length > 0) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, ...newTags],
      }));
    }
    setTagInput('');
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || !formData.price) {
      toastError('Name, Category, and Price are required');
      return;
    }

    setSaving(true);
    try {
      const dto: CreateProductDto = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        tier1Price: formData.tier1Price
          ? parseFloat(formData.tier1Price)
          : parseFloat(formData.price),
        tier2Price: formData.tier2Price ? parseFloat(formData.tier2Price) : undefined,
        tier3Price: formData.tier3Price ? parseFloat(formData.tier3Price) : undefined,
        noVat: formData.noVat,
        tags: formData.tags,
        categoryId: formData.categoryId,
        unit: formData.unit.trim(),
        isActive: formData.isActive,
        images: formData.images,
        packagingNote: formData.packagingNote.trim() || undefined,
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
        ...(formData.variants.length > 0
          ? {
              variants: formData.variants.map((v): ProductVariantDto => ({
                sku: v.sku?.trim() || undefined,
                weight: v.weight.trim() || undefined,
                description: v.description.trim() || undefined,
                image: v.image.trim() || undefined,
                price: parseFloat(v.price) || 0,
                tier1Price: v.tier1Price ? parseFloat(v.tier1Price) : undefined,
                tier2Price: v.tier2Price ? parseFloat(v.tier2Price) : undefined,
                tier3Price: v.tier3Price ? parseFloat(v.tier3Price) : undefined,
              })),
            }
          : {}),
      };

      const res = await api.createProduct(dto);
      if (res.success) {
        success(`Product "${formData.name}" added to catalog!`);
        setIsCreateOpen(false);
        loadData();
      } else {
        toastError(res.error || 'Failed to create product');
      }
    } catch {
      toastError('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSaving(true);
    try {
      const dto: UpdateProductDto = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        tier1Price: formData.tier1Price
          ? parseFloat(formData.tier1Price)
          : parseFloat(formData.price),
        tier2Price: formData.tier2Price ? parseFloat(formData.tier2Price) : undefined,
        tier3Price: formData.tier3Price ? parseFloat(formData.tier3Price) : undefined,
        noVat: formData.noVat,
        tags: formData.tags,
        categoryId: formData.categoryId,
        unit: formData.unit.trim(),
        isActive: formData.isActive,
        images: formData.images,
        packagingNote: formData.packagingNote.trim() || null,
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
        variants: formData.variants.map((v): ProductVariantDto => ({
          sku: v.sku?.trim() || undefined,
          weight: v.weight.trim() || undefined,
          description: v.description.trim() || undefined,
          image: v.image.trim() || undefined,
          price: parseFloat(v.price) || 0,
          tier1Price: v.tier1Price ? parseFloat(v.tier1Price) : undefined,
          tier2Price: v.tier2Price ? parseFloat(v.tier2Price) : undefined,
          tier3Price: v.tier3Price ? parseFloat(v.tier3Price) : undefined,
        })),
      };

      const res = await api.updateProduct(selectedProduct.id, dto);
      if (res.success) {
        success(`Product "${formData.name}" updated successfully!`);
        setIsEditOpen(false);
        loadData();
      } else {
        toastError(res.error || 'Failed to update product');
      }
    } catch {
      toastError('Error updating product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete product "${product.name}"?`)) return;

    try {
      const res = await api.deleteProduct(product.id);
      if (res.success) {
        success('Product deleted from catalog');
        loadData();
      } else {
        toastError(res.error || 'Failed to delete product');
      }
    } catch {
      toastError('Failed to delete product');
    }
  };

  // Reusable Product Form Fields
  const renderProductFormContent = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
        <Input
          label="SKU Code *"
          placeholder="e.g. SKU-1001"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          required
        />
        <Input
          label="Product Name *"
          placeholder="e.g. Premium Basmati Rice"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            className="form-input"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            required
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Product Status *</label>
          <select
            className="form-input"
            value={formData.isActive ? 'active' : 'inactive'}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
          >
            <option value="active">Active (Visible in Catalog)</option>
            <option value="inactive">Inactive (Hidden)</option>
          </select>
        </div>
      </div>

      {/* ── Multi-Tier Pricing (Requirement 1.B) ──────────────────── */}
      <div
        style={{
          padding: '0.9rem',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
            Multi-Tier Pricing (Tier 1, Tier 2, Tier 3)
          </span>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Assigned by customer tier</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginTop: '6px',
          }}
        >
          <Input
            label="Tier 1 (Base Price) * ($)"
            type="number"
            step="0.01"
            placeholder="50.00"
            value={formData.tier1Price || formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value, tier1Price: e.target.value })
            }
            required
          />
          <Input
            label="Tier 2 Price ($)"
            type="number"
            step="0.01"
            placeholder="Optional discount"
            value={formData.tier2Price}
            onChange={(e) => setFormData({ ...formData, tier2Price: e.target.value })}
          />
          <Input
            label="Tier 3 Price ($)"
            type="number"
            step="0.01"
            placeholder="Optional VIP rate"
            value={formData.tier3Price}
            onChange={(e) => setFormData({ ...formData, tier3Price: e.target.value })}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <Input
          label="Unit / Pack *"
          placeholder="e.g. 1 kg / Pack of 6"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          required
        />

        {/* ── Tax Exemption / No VAT (Requirement 1.C) ─────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: formData.noVat ? '#fef3c7' : '#f8fafc',
            border: formData.noVat ? '1px solid #fde68a' : '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            height: '42px',
            marginTop: '1.25rem',
          }}
          onClick={() => setFormData({ ...formData, noVat: !formData.noVat })}
        >
          <input
            type="checkbox"
            id="noVat"
            checked={formData.noVat}
            onChange={(e) => setFormData({ ...formData, noVat: e.target.checked })}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label
            htmlFor="noVat"
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: formData.noVat ? '#92400e' : '#475569',
            }}
          >
            No VAT (Tax-Exempt Product)
          </label>
        </div>
      </div>

      {/* ── Product Tags (Requirement 1.E) ────────────────────────── */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Tag size={14} color="#64748b" />
          <span>Product Tags</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
            (e.g. New, Hot Sale, Popular)
          </span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
          {['New', 'Hot Sale', 'Popular', 'Organic', 'Best Seller'].map((preset) => {
            const isSelected = formData.tags.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== preset) });
                  } else {
                    setFormData({ ...formData, tags: [...formData.tags, preset] });
                  }
                }}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#475569',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {isSelected ? '✓ ' : '+ '}
                {preset}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Input
            placeholder="Add custom tags separated by commas..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomTag();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddCustomTag}
            style={{ width: 'auto', padding: '0 12px', height: '40px' }}
          >
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
            {formData.tags.map((t, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '12px',
                  color: '#1d4ed8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #bfdbfe',
                }}
              >
                {t}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      tags: formData.tags.filter((_, i) => i !== idx),
                    })
                  }
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <X size={11} color="#1d4ed8" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input"
          style={{ height: '70px', paddingTop: '8px' }}
          placeholder="Product details, origin, flavour notes..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* ── Product Media Upload (Supabase Storage) ────────────────── */}
      <div
        style={{
          padding: '1.1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={17} color="#2563eb" />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                Product Images
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                Server Storage
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Upload high-resolution product photos. The first image will be the primary catalog
              thumbnail.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowManualUrlInput(!showManualUrlInput)}
            style={{
              fontSize: '0.75rem',
              color: '#2563eb',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showManualUrlInput ? 'Hide URL field' : '+ Add via URL'}
          </button>
        </div>

        {/* Manual URL Input */}
        {showManualUrlInput && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              placeholder="https://example.com/image.jpg"
              value={manualImageUrl}
              onChange={(e) => setManualImageUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddManualImageUrl}
              style={{ width: 'auto', padding: '0 14px', height: '40px' }}
            >
              Add
            </Button>
          </div>
        )}

        {/* Drag & Drop / Upload Box */}
        <div
          onClick={() => !uploadingImages && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleImageFilesUpload(e.dataTransfer.files);
            }
          }}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            backgroundColor: uploadingImages ? '#f1f5f9' : '#ffffff',
            padding: '1.25rem',
            textAlign: 'center',
            cursor: uploadingImages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleImageFilesUpload(e.target.files);
              }
            }}
          />

          {uploadingImages ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#2563eb',
              }}
            >
              <Loader2 className="spinner" size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Uploading images to server storage...
              </span>
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <UploadCloud size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                  Click to browse or drag & drop images here
                </span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Supports PNG, JPG, WebP, GIF, SVG (up to 10MB each)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Image Thumbnails Gallery */}
        {formData.images.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '10px',
              marginTop: '0.25rem',
            }}
          >
            {formData.images.map((url, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: idx === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Image */}
                <img
                  src={getMediaUrl(url)}
                  alt={`Product photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    // Fallback on broken image
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Primary Badge */}
                {idx === 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Star size={9} fill="#ffffff" /> Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryImage(idx)}
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      fontSize: '0.65rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 5px',
                      cursor: 'pointer',
                    }}
                    title="Make this the primary cover image"
                  >
                    Set Primary
                  </button>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Packaging Note ────────────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FileText size={14} color="#64748b" />
          <span>Packaging & Handling Note</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          className="form-input"
          style={{ height: '60px', paddingTop: '8px', fontSize: '0.85rem' }}
          placeholder="e.g. Keep chilled at 4°C, Fragile glass container, Packed in master cartons of 12"
          value={formData.packagingNote}
          onChange={(e) => setFormData({ ...formData, packagingNote: e.target.value })}
        />
      </div>

      {/* ── Variants Section ──────────────────────────────────────── */}
      <div
        style={{
          marginTop: '0.25rem',
          padding: '1.1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
              Product Variants
            </span>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Configure variant weights, packaging descriptions, images, and prices
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddVariant}
            style={{
              width: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              fontSize: '0.8rem',
            }}
          >
            <Plus size={14} />
            <span>Add Variant</span>
          </Button>
        </div>

        {formData.variants.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              fontSize: '0.8rem',
              color: '#94a3b8',
              border: '1px dashed #cbd5e1',
              borderRadius: '6px',
            }}
          >
            No variants added yet. Click &quot;Add Variant&quot; to configure weight and price
            tiers.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {formData.variants.map((variant, index) => (
              <div
                key={index}
                style={{
                  padding: '0.85rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1.8fr auto',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Input
                    placeholder="Variant SKU (e.g. SKU-V1)"
                    value={variant.sku || ''}
                    onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                  />
                  <Input
                    placeholder="Weight (e.g. 500g, 10kg)"
                    value={variant.weight}
                    onChange={(e) => handleVariantChange(index, 'weight', e.target.value)}
                  />

                  {/* Variant Image Uploader / URL Field */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {variant.image ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={getMediaUrl(variant.image)}
                          alt="Variant"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleVariantChange(index, 'image', '')}
                          style={{
                            position: 'absolute',
                            top: '1px',
                            right: '1px',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Remove image"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '0 8px',
                          height: '38px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.75rem',
                          color: '#475569',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {variantUploadingIndex === index ? (
                          <Loader2 className="spinner" size={14} color="#2563eb" />
                        ) : (
                          <Upload size={13} color="#2563eb" />
                        )}
                        <span>{variantUploadingIndex === index ? 'Uploading...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={variantUploadingIndex === index}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleVariantImageUpload(index, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    )}

                    <Input
                      placeholder="Or paste image URL"
                      value={variant.image}
                      onChange={(e) => handleVariantChange(index, 'image', e.target.value)}
                      style={{ height: '38px', fontSize: '0.8rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    style={{
                      padding: '8px',
                      color: '#ef4444',
                      borderRadius: '6px',
                      backgroundColor: '#fef2f2',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    title="Remove variant"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <Input
                  placeholder="Variant description (e.g. Travel bottle pack, Economy pouch)"
                  value={variant.description}
                  onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                  style={{ fontSize: '0.825rem' }}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    backgroundColor: '#f8fafc',
                    padding: '6px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Tier 1 Price ($) *"
                    value={variant.tier1Price || variant.price}
                    onChange={(e) => {
                      handleVariantChange(index, 'price', e.target.value);
                      handleVariantChange(index, 'tier1Price', e.target.value);
                    }}
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Tier 2 Price ($)"
                    value={variant.tier2Price || ''}
                    onChange={(e) => handleVariantChange(index, 'tier2Price', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Tier 3 Price ($)"
                    value={variant.tier3Price || ''}
                    onChange={(e) => handleVariantChange(index, 'tier3Price', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Product Catalog</h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
            Manage distributor products, photos, variants, and packaging notes
          </p>
        </div>

        <Button variant="action-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1,
            minWidth: '240px',
          }}
        >
          <div className="input-wrapper" style={{ width: '100%', maxWidth: '380px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', height: '40px' }}
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>Category:</span>
          <select
            className="form-input"
            style={{ width: 'auto', height: '40px', padding: '0 10px', fontSize: '0.85rem' }}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table (Reordered as per Requirement 1.D: SKU | Image | Detail | Unit/Pack | Price | Category | ...) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Image</th>
              <th>Detail</th>
              <th>Unit / Pack</th>
              <th>Price</th>
              <th>Category</th>
              <th>Variants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#64748b',
                    }}
                  >
                    <Loader2 className="spinner" size={20} color="#2563eb" />
                    <span>Loading catalog products...</span>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No products found</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Add your first product to the distributor catalog.
                  </p>
                </td>
              </tr>
            ) : (
              products.map((prod) => {
                const primaryImage = prod.images && prod.images.length > 0 ? prod.images[0] : null;
                const totalImages = prod.images?.length || 0;

                return (
                  <tr key={prod.id}>
                    {/* 1. SKU */}
                    <td>
                      <code
                        style={{
                          fontSize: '0.825rem',
                          fontFamily: 'monospace',
                          color: '#0f172a',
                          backgroundColor: '#f1f5f9',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {prod.sku}
                      </code>
                    </td>

                    {/* 2. Image */}
                    <td>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <ProductThumbnail src={primaryImage} alt={prod.name} />

                        {totalImages > 1 && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              right: '2px',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(15, 23, 42, 0.85)',
                              color: '#ffffff',
                              borderRadius: '3px',
                              padding: '1px 3px',
                              lineHeight: '1',
                            }}
                          >
                            +{totalImages - 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Detail */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                            {prod.name}
                          </strong>

                          {prod.noVat && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #fde68a',
                              }}
                            >
                              No VAT
                            </span>
                          )}

                          {prod.tags &&
                            prod.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  border: '1px solid #bfdbfe',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                        </div>

                        {prod.description && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {prod.description}
                          </div>
                        )}

                        {prod.packagingNote && (
                          <div
                            style={{
                              fontSize: '0.725rem',
                              color: '#0369a1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '2px',
                            }}
                          >
                            <FileText size={11} />
                            <span
                              style={{
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {prod.packagingNote}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Unit / Pack */}
                    <td>
                      <span style={{ fontSize: '0.825rem', color: '#475569' }}>{prod.unit}</span>
                    </td>

                    {/* 5. Price */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.925rem' }}>
                          ${Number(prod.price).toFixed(2)}
                        </strong>
                        {(prod.tier2Price || prod.tier3Price) && (
                          <span
                            style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '2px' }}
                          >
                            T1: ${Number(prod.tier1Price || prod.price).toFixed(2)}
                            {prod.tier2Price ? ` | T2: $${Number(prod.tier2Price).toFixed(2)}` : ''}
                            {prod.tier3Price ? ` | T3: $${Number(prod.tier3Price).toFixed(2)}` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Category */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.825rem',
                          color: '#2563eb',
                          fontWeight: 500,
                        }}
                      >
                        <Tag size={13} />
                        {prod.category?.name || 'Unassigned'}
                      </span>
                    </td>

                    {/* 7. Variants */}
                    <td>
                      {prod.variants && prod.variants.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              color: '#0369a1',
                              backgroundColor: '#e0f2fe',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              width: 'fit-content',
                            }}
                          >
                            <Layers size={11} />
                            {prod.variants.length}{' '}
                            {prod.variants.length === 1 ? 'Variant' : 'Variants'}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {prod.variants.slice(0, 2).map((v) => (
                              <span
                                key={v.id}
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#475569',
                                  backgroundColor: '#f1f5f9',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {v.sku ? (
                                  <strong style={{ color: '#2563eb' }}>{v.sku}: </strong>
                                ) : (
                                  ''
                                )}
                                {v.weight || 'Default'} — ${Number(v.price).toFixed(2)}
                              </span>
                            ))}
                            {prod.variants.length > 2 && (
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                +{prod.variants.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* 8. Status */}
                    <td>
                      <Badge variant={prod.isActive ? 'success' : 'danger'}>
                        {prod.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* 9. Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                          title="Edit product"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                          title="Delete product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalCount}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          isLoading={loading}
        />
      </div>

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Product to Catalog"
        maxWidth="740px"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={saving || uploadingImages}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProduct}
              isLoading={saving}
              disabled={uploadingImages}
              style={{ width: 'auto' }}
            >
              Create Product
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleCreateProduct}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {renderProductFormContent()}
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Product: ${selectedProduct?.name}`}
        maxWidth="740px"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={saving || uploadingImages}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateProduct}
              isLoading={saving}
              disabled={uploadingImages}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleUpdateProduct}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {renderProductFormContent()}
        </form>
      </Modal>
    </div>
  );
}
