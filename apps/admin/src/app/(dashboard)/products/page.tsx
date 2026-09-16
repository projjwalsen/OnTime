'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Loader2, Tag, Layers } from 'lucide-react';
import { api } from '../../../lib/api';
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

interface VariantFormItem {
  id?: string;
  weight: string;
  description: string;
  image: string;
  price: string;
}

export default function ProductsPage() {
  const { success, error: toastError } = useToast();

  const [products, setProducts] = useState<(Product & { category?: Category | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    price: '',
    unit: '1 kg',
    isActive: true,
    variants: [] as VariantFormItem[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        api.getProducts({
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(categoryFilter ? { categoryId: categoryFilter } : {}),
        }),
        api.getCategories(),
      ]);

      if (prodsRes.success && prodsRes.data) {
        setProducts(prodsRes.data.products);
      }
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data.categories);
      }
    } catch {
      toastError('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, toastError]);

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
      unit: '1 kg',
      isActive: true,
      variants: [],
    });
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
      unit: product.unit,
      isActive: product.isActive,
      variants:
        product.variants?.map((v) => ({
          id: v.id,
          weight: v.weight || '',
          description: v.description || '',
          image: v.image || '',
          price: v.price.toString(),
        })) || [],
    });
    setIsEditOpen(true);
  };

  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          weight: '',
          description: '',
          image: '',
          price: prev.price || '0.00',
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
        categoryId: formData.categoryId,
        unit: formData.unit.trim(),
        isActive: formData.isActive,
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
        ...(formData.variants.length > 0
          ? {
              variants: formData.variants.map((v): ProductVariantDto => ({
                weight: v.weight.trim() || undefined,
                description: v.description.trim() || undefined,
                image: v.image.trim() || undefined,
                price: parseFloat(v.price) || 0,
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
        categoryId: formData.categoryId,
        unit: formData.unit.trim(),
        isActive: formData.isActive,
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
        variants: formData.variants.map((v): ProductVariantDto => ({
          weight: v.weight.trim() || undefined,
          description: v.description.trim() || undefined,
          image: v.image.trim() || undefined,
          price: parseFloat(v.price) || 0,
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
            Manage distributor products, pricing, units, and categories
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>Category:</span>
          <select
            className="form-input"
            style={{ width: 'auto', height: '40px', padding: '0 10px', fontSize: '0.85rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
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

      {/* Products Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Unit / Pack</th>
              <th>Variants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
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
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No products found</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Add your first product to the distributor catalog.
                  </p>
                </td>
              </tr>
            ) : (
              products.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    <div>
                      <strong style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                        {prod.name}
                      </strong>
                      {prod.description && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            maxWidth: '280px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prod.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.825rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {prod.sku}
                    </span>
                  </td>
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
                  <td>
                    <strong style={{ color: '#0f172a', fontSize: '0.925rem' }}>
                      ${Number(prod.price).toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.825rem', color: '#475569' }}>{prod.unit}</span>
                  </td>
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
                        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {prod.variants
                            .map(
                              (v) =>
                                `${v.weight ? v.weight + ' ' : ''}$${Number(v.price).toFixed(2)}`,
                            )
                            .slice(0, 2)
                            .join(', ')}
                          {prod.variants.length > 2 ? ` +${prod.variants.length - 2} more` : ''}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={prod.isActive ? 'success' : 'danger'}>
                      {prod.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
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
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Delete product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Product to Catalog"
        maxWidth="700px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProduct}
              isLoading={saving}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Default Base Price ($) *"
              type="number"
              step="0.01"
              placeholder="50.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
            <Input
              label="Unit / Pack *"
              placeholder="e.g. 1 kg / Pack of 6"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '70px', paddingTop: '8px' }}
              placeholder="Product details, origin, packaging specs..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Variants Section */}
          <div
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
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
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                  Product Variants
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Add weight, description, image, and price variations
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
                No variants added yet. Click &quot;Add Variant&quot; to configure weights and
                pricing.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {formData.variants.map((variant, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 2fr auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <Input
                        placeholder="Weight (e.g. 500g)"
                        value={variant.weight}
                        onChange={(e) => handleVariantChange(index, 'weight', e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price ($)"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Image URL (optional)"
                        value={variant.image}
                        onChange={(e) => handleVariantChange(index, 'image', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        style={{
                          padding: '6px',
                          color: '#ef4444',
                          borderRadius: '4px',
                          backgroundColor: '#fef2f2',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remove variant"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <Input
                      placeholder="Variant description (e.g. Travel bottle pack)"
                      value={variant.description}
                      onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Product: ${selectedProduct?.name}`}
        maxWidth="700px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateProduct}
              isLoading={saving}
              style={{ width: 'auto' }}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleUpdateProduct}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <Input
            label="Product Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-input"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Default Base Price ($) *"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
            <Input
              label="Unit / Pack *"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '70px', paddingTop: '8px' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Variants Section */}
          <div
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
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
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                  Product Variants
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Add weight, description, image, and price variations
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
                No variants added yet. Click &quot;Add Variant&quot; to configure weights and
                pricing.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {formData.variants.map((variant, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 2fr auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <Input
                        placeholder="Weight (e.g. 500g)"
                        value={variant.weight}
                        onChange={(e) => handleVariantChange(index, 'weight', e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price ($)"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Image URL (optional)"
                        value={variant.image}
                        onChange={(e) => handleVariantChange(index, 'image', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        style={{
                          padding: '6px',
                          color: '#ef4444',
                          borderRadius: '4px',
                          backgroundColor: '#fef2f2',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remove variant"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <Input
                      placeholder="Variant description (e.g. Travel bottle pack)"
                      value={variant.description}
                      onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
