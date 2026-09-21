'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Search, Edit2, Trash2, Loader2, Package } from 'lucide-react';
import { api } from '../../../lib/api';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '@ontime/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';

export default function CategoriesPage() {
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<Category[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCategories({ search: search || undefined });
      if (res.success && res.data) {
        setCategories(res.data.categories);
      }
    } catch {
      toastError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [search, toastError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '' });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
    });
    setIsEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError('Category name is required');
      return;
    }

    setSaving(true);
    try {
      const dto: CreateCategoryDto = {
        name: formData.name.trim(),
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
      };

      const res = await api.createCategory(dto);
      if (res.success) {
        success(`Category "${formData.name}" created!`);
        setIsCreateOpen(false);
        loadCategories();
      } else {
        toastError(res.error || 'Failed to create category');
      }
    } catch {
      toastError('Error creating category');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.name.trim()) return;

    setSaving(true);
    try {
      const dto: UpdateCategoryDto = {
        name: formData.name.trim(),
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
      };

      const res = await api.updateCategory(selectedCategory.id, dto);
      if (res.success) {
        success(`Category "${formData.name}" updated!`);
        setIsEditOpen(false);
        loadCategories();
      } else {
        toastError(res.error || 'Failed to update category');
      }
    } catch {
      toastError('Error updating category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await api.deleteCategory(cat.id);
      if (res.success) {
        success('Category deleted');
        loadCategories();
      } else {
        toastError(res.error || 'Failed to delete category');
      }
    } catch {
      toastError('Error deleting category');
    }
  };

  return (
    <div>
      {/* Header */}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Category Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
            Organize catalog products into distributor categories
          </p>
        </div>

        <Button variant="action-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>New Category</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          maxWidth: '420px',
        }}
      >
        <div className="input-wrapper">
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', height: '40px' }}
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Product Count</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
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
                    <span>Loading categories...</span>
                  </div>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Layers size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No categories found</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Create categories to group products in the catalog.
                  </p>
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                        {cat.name}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {cat.description || '—'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        color: '#334155',
                        fontWeight: 500,
                      }}
                    >
                      {cat?.productCount ?? '—'} products
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(cat.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                        }}
                        title="Edit category"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                        }}
                        title="Delete category"
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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Category"
        maxWidth="500px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              isLoading={saving}
              style={{ width: 'auto' }}
            >
              Create Category
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <Input
            label="Category Name *"
            placeholder="e.g. Grains & Pulses"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px' }}
              placeholder="Category description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Category: ${selectedCategory?.name}`}
        maxWidth="500px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate} isLoading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleUpdate}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <Input
            label="Category Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
