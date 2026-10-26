'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Upload,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { Banner } from '@ontime/shared';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';

export default function BannersPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    displayOrder: 0,
    isActive: true,
  });

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBanners();
      if (res.success && res.data) {
        setBanners(res.data.banners);
      }
    } catch {
      toastError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingBannerId(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      displayOrder: banners.length,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: Banner) => {
    setIsEditing(true);
    setEditingBannerId(b.id);
    setFormData({
      title: b.title,
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl || '',
      displayOrder: b.displayOrder,
      isActive: b.isActive,
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await api.uploadMedia([file]);
      if (res.success && res.data?.files?.[0]?.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data!.files[0]!.url }));
        toastSuccess('Banner image uploaded successfully!');
      } else {
        toastError(res.error || 'Failed to upload image');
      }
    } catch {
      toastError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toastError('Banner title is required');
      return;
    }
    if (!formData.imageUrl.trim()) {
      toastError('Banner image is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        imageUrl: formData.imageUrl.trim(),
        linkUrl: formData.linkUrl.trim() || undefined,
        displayOrder: Number(formData.displayOrder) || 0,
        isActive: formData.isActive,
      };

      if (isEditing && editingBannerId) {
        const res = await api.updateBanner(editingBannerId, payload);
        if (res.success) {
          toastSuccess('Banner updated successfully');
          setIsModalOpen(false);
          loadBanners();
        } else {
          toastError(res.error || 'Failed to update banner');
        }
      } else {
        const res = await api.createBanner(payload);
        if (res.success) {
          toastSuccess('Banner created successfully');
          setIsModalOpen(false);
          loadBanners();
        } else {
          toastError(res.error || 'Failed to create banner');
        }
      }
    } catch {
      toastError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBanner = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete banner "${title}"?`)) {
      return;
    }
    try {
      const res = await api.deleteBanner(id);
      if (res.success) {
        toastSuccess('Banner deleted successfully');
        loadBanners();
      } else {
        toastError(res.error || 'Failed to delete banner');
      }
    } catch {
      toastError('Failed to delete banner');
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    try {
      const res = await api.updateBanner(banner.id, { isActive: !banner.isActive });
      if (res.success) {
        toastSuccess(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
        loadBanners();
      } else {
        toastError(res.error || 'Failed to update banner status');
      }
    } catch {
      toastError('Failed to toggle status');
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
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Homepage Carousel Banners
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
            Manage promotional banners and call-to-actions shown on the customer dashboard
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          Add Banner
        </Button>
      </div>

      {/* Banners List / Grid */}
      {loading ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '4rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <Loader2 className="spinner" size={24} color="#2563eb" style={{ margin: '0 auto 8px' }} />
          <p>Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '4rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <ImageIcon size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
            No Banners Configured
          </h3>
          <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
            Add homepage banners to showcase promotions and announcements to your retailers.
          </p>
          <Button variant="primary" onClick={handleOpenCreateModal} style={{ marginTop: '1rem' }}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Add First Banner
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {banners.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Banner Image Preview */}
              <div
                style={{
                  height: '160px',
                  backgroundColor: '#f8fafc',
                  backgroundImage: `url(${b.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    display: 'flex',
                    gap: '6px',
                  }}
                >
                  <Badge variant={b.isActive ? 'success' : 'danger'}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '10px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Order #{b.displayOrder}
                </div>
              </div>

              {/* Banner Body */}
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '4px',
                  }}
                >
                  {b.title}
                </h3>
                {b.subtitle && (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '10px' }}>
                    {b.subtitle}
                  </p>
                )}

                {b.linkUrl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      color: '#2563eb',
                      marginTop: 'auto',
                      marginBottom: '12px',
                      wordBreak: 'break-all',
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>{b.linkUrl}</span>
                  </div>
                )}

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    marginTop: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(b)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: b.isActive ? '#f8fafc' : '#eff6ff',
                      color: b.isActive ? '#64748b' : '#2563eb',
                      cursor: 'pointer',
                    }}
                  >
                    {b.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                    {b.isActive ? 'Hide' : 'Show'}
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(b)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                      title="Edit banner"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(b.id, b.title)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #fee2e2',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                      title="Delete banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Banner Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Banner' : 'Add New Homepage Banner'}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Banner Title *"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Summer Mega Sale, New Arrivals"
            />

            <Input
              label="Subtitle / Promotional Caption (Optional)"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="e.g. Enjoy up to 30% off on all beverage packs"
            />

            {/* Banner Image URL & Uploader */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '4px',
                }}
              >
                Banner Image *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="https://... or upload image"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  style={{ flex: 1, height: '40px' }}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 size={14} className="spinner" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Upload
                </Button>
              </div>

              {formData.imageUrl && (
                <div
                  style={{
                    marginTop: '8px',
                    height: '100px',
                    borderRadius: '8px',
                    backgroundImage: `url(${formData.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                />
              )}
            </div>

            <Input
              label="Target Action URL / Link (Optional)"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              placeholder="e.g. /products, https://ontime.com/offers"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Display Order (Sequence)"
                type="number"
                value={formData.displayOrder.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })
                }
                placeholder="0"
              />

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    marginTop: '16px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                    Active (Visible on homepage)
                  </span>
                </label>
              </div>
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting}>
                {isEditing ? 'Update Banner' : 'Create Banner'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
