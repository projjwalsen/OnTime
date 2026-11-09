'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Package,
  PackageCheck,
  PackagePlus,
  Layers,
  UploadCloud,
  Image as ImageIcon,
  X,
  Star,
  FileText,
  Upload,
  Tag,
  Palette,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getMediaUrl } from '../../lib/config';
import {
  Product,
  Category,
  CreateProductDto,
  ProductTag,
  ProductVariantDto,
  resolveProductTag,
} from '@ontime/shared';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

export interface VariantFormItem {
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

export interface ProductFormProps {
  initialData?: Product | null;
  categories: Category[];
  onSubmit: (dto: CreateProductDto) => Promise<void>;
  saving: boolean;
  isEdit?: boolean;
  onDelete?: () => Promise<void>;
  deleting?: boolean;
}

const QUICK_TAG_PALETTES = [
  { name: 'Blue', textColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  { name: 'Red', textColor: '#dc2626', backgroundColor: '#fef2f2' },
  { name: 'Green', textColor: '#15803d', backgroundColor: '#f0fdf4' },
  { name: 'Purple', textColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  { name: 'Amber', textColor: '#b45309', backgroundColor: '#fffbeb' },
  { name: 'Teal', textColor: '#0f766e', backgroundColor: '#f0fdfa' },
  { name: 'Fuchsia', textColor: '#c026d3', backgroundColor: '#fdf4ff' },
  { name: 'Rose', textColor: '#be123c', backgroundColor: '#fff1f2' },
  { name: 'Orange', textColor: '#ea580c', backgroundColor: '#fff7ed' },
  { name: 'Dark', textColor: '#f8fafc', backgroundColor: '#1e293b' },
];

function formatDate(dateInput?: string | Date): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ProductForm({
  initialData,
  categories,
  onSubmit,
  saving,
  isEdit = false,
  onDelete,
  deleting = false,
}: ProductFormProps) {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload State
  const [uploadingImages, setUploadingImages] = useState(false);
  const [variantUploadingIndex, setVariantUploadingIndex] = useState<number | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagTextColor, setTagTextColor] = useState('#1d4ed8');
  const [tagBgColor, setTagBgColor] = useState('#eff6ff');
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: initialData?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    name: initialData?.name || '',
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || categories[0]?.id || '',
    price: initialData?.price ? initialData.price.toString() : '50.00',
    tier1Price: initialData?.tier1Price
      ? initialData.tier1Price.toString()
      : initialData?.price
        ? initialData.price.toString()
        : '50.00',
    tier2Price: initialData?.tier2Price ? initialData.tier2Price.toString() : '',
    tier3Price: initialData?.tier3Price ? initialData.tier3Price.toString() : '',
    noVat: Boolean(initialData?.noVat),
    tags: initialData?.tags ? initialData.tags.map(resolveProductTag) : [],
    unit: initialData?.unit || '1 kg',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    images: initialData?.images ? [...initialData.images] : ([] as string[]),
    packagingNote: initialData?.packagingNote || '',
    variants:
      initialData?.variants?.map((v): VariantFormItem => ({
        id: v.id,
        sku: v.sku || '',
        weight: v.weight || '',
        description: v.description || '',
        image: v.image || '',
        price: v.price.toString(),
        tier1Price: v.tier1Price ? v.tier1Price.toString() : v.price.toString(),
        tier2Price: v.tier2Price ? v.tier2Price.toString() : '',
        tier3Price: v.tier3Price ? v.tier3Price.toString() : '',
      })) || ([] as VariantFormItem[]),
  });

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

  const handleTogglePresetTag = (preset: string) => {
    const existingIndex = formData.tags.findIndex(
      (t) => t.name.toLowerCase() === preset.toLowerCase(),
    );
    if (existingIndex >= 0) {
      setFormData((prev) => ({
        ...prev,
        tags: prev.tags.filter((_, i) => i !== existingIndex),
      }));
    } else {
      const resolved = resolveProductTag(preset);
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, resolved],
      }));
    }
  };

  const handleAddCustomTag = () => {
    if (!tagInput.trim()) return;
    const names = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newTags: ProductTag[] = names.map((name) => ({
      name,
      textColor: tagTextColor,
      backgroundColor: tagBgColor,
      bgColor: tagBgColor,
    }));

    setFormData((prev) => {
      const updated = [...prev.tags];
      newTags.forEach((nt) => {
        const idx = updated.findIndex((t) => t.name.toLowerCase() === nt.name.toLowerCase());
        if (idx >= 0) {
          updated[idx] = nt;
        } else {
          updated.push(nt);
        }
      });
      return {
        ...prev,
        tags: updated,
      };
    });
    setTagInput('');
  };

  const handleSelectTagForEditing = (tag: ProductTag) => {
    setTagInput(tag.name);
    setTagTextColor(tag.textColor);
    setTagBgColor(tag.backgroundColor || tag.bgColor);
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Product name is required');
      toastError('Product name is required');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Category selection is required');
      toastError('Category selection is required');
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Base price must be a valid positive number');
      toastError('Base price must be a valid positive number');
      return;
    }

    const dto: CreateProductDto = {
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      price: priceNum,
      tier1Price: formData.tier1Price ? parseFloat(formData.tier1Price) : priceNum,
      tier2Price: formData.tier2Price ? parseFloat(formData.tier2Price) : undefined,
      tier3Price: formData.tier3Price ? parseFloat(formData.tier3Price) : undefined,
      noVat: formData.noVat,
      tags: formData.tags,
      categoryId: formData.categoryId,
      unit: formData.unit.trim() || '1 kg',
      isActive: formData.isActive,
      images: formData.images,
      packagingNote: formData.packagingNote.trim() || undefined,
      ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
      ...(formData.variants.length > 0
        ? {
            variants: formData.variants.map((v): ProductVariantDto => ({
              id: v.id,
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

    await onSubmit(dto);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* ── Top Header with Breadcrumb, Title & Top Right Action Buttons ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          {/* Breadcrumb */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}
          >
            <Link
              href="/products"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                height: '36px',
                fontSize: '0.85rem',
                textDecoration: 'none',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
              }}
            >
              <ArrowLeft size={14} />
              <span>Product Catalog</span>
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#64748b' }}>
              {isEdit ? initialData?.name || 'Edit Product' : 'New Product'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              {isEdit ? <PackageCheck size={24} /> : <PackagePlus size={24} />}
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                {isEdit ? `Edit: ${initialData?.name || 'Product'}` : 'Add New Product'}
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
                {isEdit ? (
                  <>
                    SKU: <strong style={{ color: '#2563eb' }}>{initialData?.sku}</strong>
                    {initialData?.createdAt && (
                      <> • Created on {formatDate(initialData.createdAt)}</>
                    )}
                  </>
                ) : (
                  'Configure product details, multi-tier wholesale prices, VAT rates, tags, gallery photos, and packaging variants'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Top Right Action Buttons: Delete Product, Save Changes ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isEdit && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              isLoading={deleting}
              disabled={saving || uploadingImages}
              style={{ width: 'auto', padding: '0 18px', height: '42px' }}
            >
              <Trash2 size={15} />
              <span>Delete Product</span>
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            disabled={uploadingImages || deleting}
            style={{ width: 'auto', padding: '0 24px', height: '42px', fontSize: '0.9rem' }}
          >
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>

      {formError && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      {/* ── Card 1: Basic Information ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <Package size={18} color="#2563eb" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Basic Information</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <Input
              label="Product SKU *"
              placeholder="e.g. SKU-1001"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
            />
            <Input
              label="Product Name *"
              placeholder="e.g. Arabica Dark Roast Whole Beans"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                style={{ height: '40px' }}
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
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.value === 'active' })
                }
                style={{ height: '40px' }}
              >
                <option value="active">Active (Visible in Catalog)</option>
                <option value="inactive">Inactive (Hidden)</option>
              </select>
            </div>

            <Input
              label="Unit / Packaging *"
              placeholder="e.g. 1 kg / Pack of 6"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* ── Card 2: Wholesale Pricing & Tax Settings ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} color="#2563eb" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Multi-Tier Wholesale Pricing & Tax Settings
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Assigned dynamically by customer tier at checkout
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1rem',
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
                placeholder="Optional preferred discount"
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

          {/* Tax Exemption / No VAT Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: formData.noVat ? '#fef3c7' : '#f8fafc',
              border: formData.noVat ? '1px solid #fde68a' : '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setFormData({ ...formData, noVat: !formData.noVat })}
          >
            <input
              type="checkbox"
              id="noVat"
              checked={formData.noVat}
              onChange={(e) => setFormData({ ...formData, noVat: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <label
                htmlFor="noVat"
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: formData.noVat ? '#92400e' : '#1e293b',
                  display: 'block',
                }}
              >
                No VAT (Tax-Exempt Product)
              </label>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: formData.noVat ? '#b45309' : '#64748b',
                  margin: '2px 0 0 0',
                }}
              >
                When checked, 0% VAT is applied to this item during order placement and invoice
                billing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 3: Product Tags & Badges ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <Tag size={18} color="#2563eb" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
            Product Tags & Badges
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Preset Badges Section */}
          <div>
            <span
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#334155',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Preset Badges (Click to toggle):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['New', 'Hot Sale', 'Popular', 'Organic', 'Best Seller'].map((preset) => {
                const isSelected = formData.tags.some(
                  (t) => t.name.toLowerCase() === preset.toLowerCase(),
                );
                const tagStyle = resolveProductTag(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTogglePresetTag(preset)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '4px 11px',
                      borderRadius: '14px',
                      border: isSelected ? `1px solid ${tagStyle.textColor}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? tagStyle.backgroundColor : '#ffffff',
                      color: isSelected ? tagStyle.textColor : '#475569',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tag Designer with Text Color & Background Color */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '0.85rem',
              }}
            >
              <Palette size={16} color="#2563eb" />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                Custom Tag Color Designer
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 1fr) 150px 150px auto',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              {/* Column 1: Tag Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Tag Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Clearance, Gluten Free, 50% Off..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  style={{ height: '42px', fontSize: '0.875rem' }}
                />
              </div>

              {/* Column 2: Text Color */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Text Color
                </label>
                <div
                  className="form-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 8px',
                    height: '42px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <input
                    type="color"
                    value={tagTextColor}
                    onChange={(e) => setTagTextColor(e.target.value)}
                    style={{
                      width: '26px',
                      height: '26px',
                      padding: 0,
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Choose text color"
                  />
                  <input
                    type="text"
                    value={tagTextColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTagTextColor(val.startsWith('#') || !val ? val : '#' + val);
                    }}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      color: '#0f172a',
                      width: '100%',
                      backgroundColor: 'transparent',
                    }}
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Column 3: Background Color */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Background Color
                </label>
                <div
                  className="form-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 8px',
                    height: '42px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <input
                    type="color"
                    value={tagBgColor}
                    onChange={(e) => setTagBgColor(e.target.value)}
                    style={{
                      width: '26px',
                      height: '26px',
                      padding: 0,
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Choose background color"
                  />
                  <input
                    type="text"
                    value={tagBgColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTagBgColor(val.startsWith('#') || !val ? val : '#' + val);
                    }}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      color: '#0f172a',
                      width: '100%',
                      backgroundColor: 'transparent',
                    }}
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Column 4: Add Button */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    visibility: 'hidden',
                    userSelect: 'none',
                  }}
                >
                  Action
                </label>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddCustomTag}
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    width: 'auto',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>Add Tag</span>
                </Button>
              </div>
            </div>

            {/* Quick Color Palette Swatches & Live Preview */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '1rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  Quick Palettes:
                </span>
                {QUICK_TAG_PALETTES.map((qp) => (
                  <button
                    key={qp.name}
                    type="button"
                    onClick={() => {
                      setTagTextColor(qp.textColor);
                      setTagBgColor(qp.backgroundColor);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 9px',
                      borderRadius: '10px',
                      backgroundColor: qp.backgroundColor,
                      color: qp.textColor,
                      border: `1px solid ${qp.textColor}33`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Apply ${qp.name} palette`}
                  >
                    {qp.name}
                  </button>
                ))}
              </div>

              {/* Live Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  Live Preview:
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: tagBgColor,
                    color: tagTextColor,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: `1px solid ${tagTextColor}33`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    minWidth: '70px',
                    justifyContent: 'center',
                  }}
                >
                  {tagInput.trim() || 'Sample Badge'}
                </span>
              </div>
            </div>
          </div>

          {/* Applied Tags List */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                Applied Product Tags ({formData.tags.length}):
              </span>
              {formData.tags.length > 0 && (
                <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                  Click any tag to edit its colors in the designer
                </span>
              )}
            </div>

            {formData.tags.length === 0 ? (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                No tags assigned to this product yet. Click preset badges or design custom tags
                above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                      backgroundColor: tag.backgroundColor || tag.bgColor,
                      borderRadius: '14px',
                      color: tag.textColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: `1px solid ${tag.textColor}33`,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSelectTagForEditing(tag)}
                    title={`Click to load "${tag.name}" into Color Designer`}
                  >
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(idx);
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove tag"
                    >
                      <X size={12} color={tag.textColor} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Card 4: Description & Handling Note ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <FileText size={18} color="#2563eb" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
            Description & Packaging Note
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Product Description</label>
            <textarea
              className="form-input"
              style={{ minHeight: '85px', paddingTop: '8px', fontSize: '0.875rem' }}
              placeholder="Provide catalog specifications, ingredients, origin, roast notes, storage guidance..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <FileText size={14} color="#64748b" />
              <span>Packaging & Handling Note</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              className="form-input"
              style={{ minHeight: '65px', paddingTop: '8px', fontSize: '0.875rem' }}
              placeholder="e.g. Keep chilled at 4°C, Fragile glass container, Packed in master cartons of 12"
              value={formData.packagingNote}
              onChange={(e) => setFormData({ ...formData, packagingNote: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Card 5: Product Media & Gallery ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Product Photos & Media Gallery
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                Server Storage
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Upload high-resolution photos. The first image is the primary catalog thumbnail.
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
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
              style={{ width: 'auto', padding: '0 16px', height: '40px' }}
            >
              Add URL
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
            borderRadius: '10px',
            backgroundColor: uploadingImages ? '#f1f5f9' : '#fafafa',
            padding: '1.5rem',
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
              <Loader2 className="spinner" size={22} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Uploading images to server storage...
              </span>
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <UploadCloud size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  Click to browse or drag & drop product photos here
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '12px',
              marginTop: '1.25rem',
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
                <img
                  src={getMediaUrl(url)}
                  alt={`Product photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Primary Cover Badge */}
                {idx === 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Star size={10} fill="#ffffff" /> Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryImage(idx)}
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      fontSize: '0.68rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                    title="Make this the primary cover image"
                  >
                    Set Primary
                  </button>
                )}

                {/* Remove Image Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '22px',
                    height: '22px',
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
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Card 6: Product Variants ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Product Variants
              </h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
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
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.825rem',
            }}
          >
            <Plus size={15} />
            <span>Add Variant</span>
          </Button>
        </div>

        {formData.variants.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              fontSize: '0.85rem',
              color: '#94a3b8',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
            }}
          >
            No variants added yet. Click &quot;Add Variant&quot; to configure weight options and
            price tiers.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {formData.variants.map((variant, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1.8fr auto',
                    gap: '10px',
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
                          width: '40px',
                          height: '40px',
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
                            width: '15px',
                            height: '15px',
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
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '0 10px',
                          height: '40px',
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
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
                          <Upload size={14} color="#2563eb" />
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
                      style={{ height: '40px', fontSize: '0.8rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    style={{
                      padding: '8px',
                      color: '#ef4444',
                      borderRadius: '6px',
                      backgroundColor: '#fee2e2',
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
                  placeholder="Variant packaging description (e.g. Travel bottle pack, Economy pouch)"
                  value={variant.description}
                  onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                    backgroundColor: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
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
    </form>
  );
}
