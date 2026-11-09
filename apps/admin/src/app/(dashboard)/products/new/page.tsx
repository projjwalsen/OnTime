'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import { Category, CreateProductDto } from '@ontime/shared';
import { useToast } from '../../../../components/ui/Toast';
import { ProductForm } from '../../../../components/products/ProductForm';

export default function NewProductPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.getCategories();
        if (res.success && res.data?.categories) {
          setCategories(res.data.categories);
        } else {
          toastError(res.error || 'Failed to load categories');
        }
      } catch {
        toastError('Failed to load categories from server');
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, [toastError]);

  const handleCreateProduct = async (dto: CreateProductDto) => {
    setSaving(true);
    try {
      const res = await api.createProduct(dto);
      if (res.success && res.data?.product) {
        success(`Product "${dto.name}" created successfully!`);
        router.push('/products');
      } else {
        toastError(res.error || 'Failed to create product');
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : 'Error creating product';
      toastError(errStr);
    } finally {
      setSaving(false);
    }
  };

  if (loadingCategories) {
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
          <span>Loading catalog options...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '3rem', maxWidth: '1080px', margin: '0 auto' }}>
      <ProductForm
        categories={categories}
        onSubmit={handleCreateProduct}
        saving={saving}
        isEdit={false}
      />
    </div>
  );
}
