'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Edit2, Trash2, Loader2, Layers } from 'lucide-react';
import { api } from '../../../lib/api';
import { getMediaUrl } from '../../../lib/config';
import { Product, Category, resolveProductTag } from '@ontime/shared';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { Pagination } from '../../../components/ui/Pagination';

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

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete product "${product.name}"?`)) return;

    try {
      const res = await api.deleteProduct(product.id);
      if (res.success) {
        success(`Product "${product.name}" removed from catalog`);
        loadData();
      } else {
        toastError(res.error || 'Failed to delete product');
      }
    } catch {
      toastError('Error deleting product');
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
            Manage distributor products, photos, variants, and packaging notes
          </p>
        </div>

        <Link
          href="/products/new"
          className="btn-action-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
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

      {/* Products Table */}
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
                      <Link
                        href={`/products/${prod.id}`}
                        style={{ textDecoration: 'none' }}
                        title="Edit product"
                      >
                        <code
                          style={{
                            fontSize: '0.825rem',
                            fontFamily: 'monospace',
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {prod.sku}
                        </code>
                      </Link>
                    </td>

                    {/* 2. Image */}
                    <td>
                      <Link
                        href={`/products/${prod.id}`}
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
                          cursor: 'pointer',
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
                      </Link>
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
                          <Link
                            href={`/products/${prod.id}`}
                            style={{
                              color: '#0f172a',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              textDecoration: 'none',
                            }}
                          >
                            {prod.name}
                          </Link>

                          {prod.noVat ? (
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
                          ) : prod.taxRate !== undefined && prod.taxRate > 0 ? (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              VAT: {prod.taxRate}%
                            </span>
                          ) : null}

                          {prod.tags &&
                            prod.tags.map((tag, tIdx) => {
                              const tagStyle = resolveProductTag(tag);
                              return (
                                <span
                                  key={tIdx}
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    backgroundColor: tagStyle.backgroundColor,
                                    color: tagStyle.textColor,
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    border: `1px solid ${tagStyle.textColor}33`,
                                  }}
                                >
                                  {tagStyle.name}
                                </span>
                              );
                            })}
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
                              fontSize: '0.7rem',
                              color: '#94a3b8',
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontStyle: 'italic',
                            }}
                          >
                            Note: {prod.packagingNote}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Unit / Pack */}
                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#475569',
                          backgroundColor: '#f8fafc',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          fontWeight: 500,
                        }}
                      >
                        {prod.unit || '1 kg'}
                      </span>
                    </td>

                    {/* 5. Price Tiers */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                          ${Number(prod.price).toFixed(2)}
                        </span>
                        {(prod.tier2Price || prod.tier3Price) && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {prod.tier2Price && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  color: '#0284c7',
                                  backgroundColor: '#e0f2fe',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                }}
                              >
                                T2: ${Number(prod.tier2Price).toFixed(2)}
                              </span>
                            )}
                            {prod.tier3Price && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  color: '#7c3aed',
                                  backgroundColor: '#ede9fe',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                }}
                              >
                                T3: ${Number(prod.tier3Price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 6. Category */}
                    <td>
                      <span style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 500 }}>
                        {prod.category?.name || 'Uncategorized'}
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
                        <Link
                          href={`/products/${prod.id}`}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            textDecoration: 'none',
                          }}
                          title="Edit product"
                        >
                          <Edit2 size={15} />
                        </Link>
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
    </div>
  );
}
