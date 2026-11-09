'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../../../lib/api';
import { Product, Category, CreateProductDto, UpdateProductDto } from '@ontime/shared';
import { useToast } from '../../../../components/ui/Toast';
import { ProductForm } from '../../../../components/products/ProductForm';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { success, error: toastError } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [prodRes, catsRes] = await Promise.all([
        api.getProduct(productId),
        api.getCategories(),
      ]);

      if (prodRes.success && prodRes.data?.product) {
        setProduct(prodRes.data.product);
      } else {
        const msg = prodRes.error || 'Product not found';
        setLoadError(msg);
        toastError(msg);
      }

      if (catsRes.success && catsRes.data?.categories) {
        setCategories(catsRes.data.categories);
      }
    } catch {
      const msg = 'Failed to load product details from server';
      setLoadError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [productId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateProduct = async (dto: CreateProductDto) => {
    if (!productId) return;
    setSaving(true);
    try {
      const updateDto: UpdateProductDto = {
        sku: dto.sku,
        name: dto.name,
        price: dto.price,
        tier1Price: dto.tier1Price,
        tier2Price: dto.tier2Price,
        tier3Price: dto.tier3Price,
        noVat: dto.noVat,
        tags: dto.tags,
        categoryId: dto.categoryId,
        unit: dto.unit,
        isActive: dto.isActive,
        images: dto.images,
        packagingNote: dto.packagingNote || null,
        description: dto.description || null,
        variants: dto.variants,
      };

      const res = await api.updateProduct(productId, updateDto);
      if (res.success) {
        success(`Product "${dto.name}" updated successfully!`);
        router.push('/products');
      } else {
        toastError(res.error || 'Failed to update product');
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : 'Error updating product';
      toastError(errStr);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete "${product.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await api.deleteProduct(product.id);
      if (res.success) {
        success(`Product "${product.name}" deleted from catalog`);
        router.push('/products');
      } else {
        toastError(res.error || 'Failed to delete product');
      }
    } catch {
      toastError('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingBottom: '3rem', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
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
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            gap: '10px',
            color: '#64748b',
          }}
        >
          <Loader2 className="spinner" size={24} color="#2563eb" />
          <span>Loading product details...</span>
        </div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div style={{ paddingBottom: '3rem', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
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
        </div>
        <div
          style={{
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
            Product Not Found
          </h2>
          <p style={{ color: '#64748b', marginTop: '4px', marginBottom: '1.5rem' }}>
            {loadError || 'The requested product could not be located in the catalog.'}
          </p>
          <Link
            href="/products"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              textDecoration: 'none',
              borderRadius: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '3rem', maxWidth: '1080px', margin: '0 auto' }}>
      <ProductForm
        initialData={product}
        categories={categories}
        onSubmit={handleUpdateProduct}
        saving={saving}
        isEdit={true}
        onDelete={handleDeleteProduct}
        deleting={deleting}
      />
    </div>
  );
}
