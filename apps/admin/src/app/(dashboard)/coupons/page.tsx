'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Calendar,
  Percent,
  DollarSign,
  Trash2,
  Edit,
  Building,
  User,
  Loader2,
  Mail,
} from 'lucide-react';
import { api } from '../../../lib/api';
import {
  Coupon,
  DiscountType,
  Organisation,
  User as UserModel,
  CreateCouponDto,
  UpdateCouponDto,
} from '@ontime/shared';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { useToast } from '../../../components/ui/Toast';

export default function CouponsPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Organisations & Users for targeting dropdown
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: DiscountType.PERCENTAGE,
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    usageLimit: '1',
    expiresAt: '',
    isActive: true,
    targetType: 'ALL', // 'ALL' | 'ORGANISATION' | 'USER'
    organisationId: '',
    userId: '',
    sendEmailToCustomer: true,
  });

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCoupons({
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter !== 'all' ? { isActive: statusFilter === 'active' } : {}),
      });
      if (res.success && res.data) {
        setCoupons(res.data.coupons);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch {
      toastError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, toastError]);

  const loadTargetEntities = useCallback(async () => {
    try {
      const [orgsRes, usersRes] = await Promise.all([
        api.getOrganisations({ limit: 100 }),
        api.getUsers({ limit: 100 }),
      ]);
      if (orgsRes.success && orgsRes.data?.organisations) {
        setOrganisations(orgsRes.data.organisations);
      }
      if (usersRes.success && usersRes.data?.users) {
        setUsers(usersRes.data.users);
      }
    } catch {
      // non-critical targeting lookup
    }
  }, []);

  useEffect(() => {
    loadTargetEntities();
  }, [loadTargetEntities]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCoupons();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCoupons]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingCouponId(null);
    setFormData({
      code: '',
      description: '',
      discountType: DiscountType.PERCENTAGE,
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      usageLimit: '1',
      expiresAt: '',
      isActive: true,
      targetType: 'ALL',
      organisationId: '',
      userId: '',
      sendEmailToCustomer: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setIsEditing(true);
    setEditingCouponId(coupon.id);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderAmount: coupon.minOrderAmount ? coupon.minOrderAmount.toString() : '',
      maxDiscount: coupon.maxDiscount ? coupon.maxDiscount.toString() : '',
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : '1',
      expiresAt: coupon.expiresAt
        ? (new Date(coupon.expiresAt).toISOString().split('T')[0] ?? '')
        : '',
      isActive: coupon.isActive,
      targetType: coupon.userId ? 'USER' : coupon.organisationId ? 'ORGANISATION' : 'ALL',
      organisationId: coupon.organisationId || '',
      userId: coupon.userId || '',
      sendEmailToCustomer: false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toastError('Coupon code is required');
      return;
    }
    const val = parseFloat(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      toastError('Please enter a valid positive discount value');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingCouponId) {
        const updatePayload: UpdateCouponDto = {
          description: formData.description.trim() || null,
          discountType: formData.discountType,
          discountValue: val,
          minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : 1,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
          isActive: formData.isActive,
          organisationId:
            formData.targetType === 'ORGANISATION' && formData.organisationId
              ? formData.organisationId
              : null,
          userId: formData.targetType === 'USER' && formData.userId ? formData.userId : null,
        };
        const res = await api.updateCoupon(editingCouponId, updatePayload);
        if (res.success) {
          toastSuccess('Coupon updated successfully');
          setIsModalOpen(false);
          loadCoupons();
        } else {
          toastError(res.error || 'Failed to update coupon');
        }
      } else {
        const createPayload: CreateCouponDto = {
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || undefined,
          discountType: formData.discountType,
          discountValue: val,
          minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : 1,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
          isActive: formData.isActive,
          organisationId:
            formData.targetType === 'ORGANISATION' && formData.organisationId
              ? formData.organisationId
              : null,
          userId: formData.targetType === 'USER' && formData.userId ? formData.userId : null,
          sendEmailToCustomer: formData.sendEmailToCustomer,
        };
        const res = await api.createCoupon(createPayload);
        if (res.success) {
          toastSuccess(
            createPayload.sendEmailToCustomer &&
              (createPayload.userId || createPayload.organisationId)
              ? 'Coupon created and email sent to recipient!'
              : 'Coupon created successfully!',
          );
          setIsModalOpen(false);
          loadCoupons();
        } else {
          toastError(res.error || 'Failed to create coupon');
        }
      }
    } catch {
      toastError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      return;
    }
    try {
      const res = await api.deleteCoupon(id);
      if (res.success) {
        toastSuccess(`Coupon "${code}" deleted successfully`);
        loadCoupons();
      } else {
        toastError(res.error || 'Failed to delete coupon');
      }
    } catch {
      toastError('Failed to delete coupon');
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const res = await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      if (res.success) {
        toastSuccess(`Coupon "${coupon.code}" ${!coupon.isActive ? 'activated' : 'deactivated'}`);
        loadCoupons();
      } else {
        toastError(res.error || 'Failed to update status');
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
            Coupons & Discounts
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
            Create and manage user-specific and platform-wide promotional discount codes
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          Create Coupon
        </Button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div className="input-wrapper" style={{ minWidth: '280px', flex: 1 }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', height: '40px' }}
            placeholder="Search coupon code or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
            setPage(1);
          }}
          className="form-input"
          style={{ width: '160px', height: '40px' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Coupons Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Discount</th>
              <th>Target Audience</th>
              <th>Min Order / Max Cap</th>
              <th>Usage</th>
              <th>Expires At</th>
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
                    <span>Loading coupons...</span>
                  </div>
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Ticket size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No coupons found</p>
                  <p style={{ fontSize: '0.85rem' }}>
                    Create your first coupon using the button above.
                  </p>
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: '#f1f5f9',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#1e293b',
                          letterSpacing: '0.5px',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        {c.code}
                      </span>
                    </div>
                    {c.description && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {c.discountType === DiscountType.PERCENTAGE ? (
                        <>
                          <Percent size={14} color="#2563eb" />
                          <span>{c.discountValue}% OFF</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={14} color="#16a34a" />
                          <span>${c.discountValue} OFF</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    {c.userName ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          color: '#2563eb',
                          fontWeight: 500,
                        }}
                      >
                        <User size={12} /> {c.userName}
                      </span>
                    ) : c.organisationName ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          color: '#475569',
                          fontWeight: 500,
                        }}
                      >
                        <Building size={12} /> {c.organisationName}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>All Customers</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {c.minOrderAmount ? `Min: $${c.minOrderAmount}` : 'No min'}
                      {c.maxDiscount ? ` | Cap: $${c.maxDiscount}` : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                      <strong>{c.usedCount}</strong> / {c.usageLimit || '∞'}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Calendar size={12} />
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Badge variant={c.isActive ? 'success' : 'danger'}>
                        {c.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(c)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                        title="Edit coupon"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c.id, c.code)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #fee2e2',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                        title="Delete coupon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
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
          pageSizeOptions={[10, 20, 50]}
          isLoading={loading}
        />
      </div>

      {/* Create / Edit Coupon Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Coupon Code' : 'Create New Coupon'}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Coupon Code *"
                required
                disabled={isEditing}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20, WELCOME50"
              />

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
                  Discount Type *
                </label>
                <select
                  className="form-input"
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as DiscountType })
                  }
                  style={{ height: '40px' }}
                >
                  <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
                  <option value={DiscountType.FLAT}>Flat Amount ($)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label={`Discount Value * (${formData.discountType === DiscountType.PERCENTAGE ? '%' : '$'})`}
                type="number"
                step="0.01"
                required
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder={formData.discountType === DiscountType.PERCENTAGE ? '15' : '25.00'}
              />

              <Input
                label="Maximum Discount Cap ($) (Optional)"
                type="number"
                step="0.01"
                value={formData.maxDiscount}
                onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                placeholder="e.g. 100.00"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Minimum Order Amount ($) (Optional)"
                type="number"
                step="0.01"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                placeholder="e.g. 50.00"
              />

              <Input
                label="Usage Limit (Total times redeemable)"
                type="number"
                required
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="1"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Expiry Date (Optional)"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />

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
                  Target Audience
                </label>
                <select
                  className="form-input"
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                  style={{ height: '40px' }}
                >
                  <option value="ALL">All Retailers (Public)</option>
                  <option value="ORGANISATION">Specific Organisation</option>
                  <option value="USER">Specific User Account</option>
                </select>
              </div>
            </div>

            {formData.targetType === 'ORGANISATION' && (
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
                  Select Customer Organisation *
                </label>
                <select
                  className="form-input"
                  value={formData.organisationId}
                  onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                  style={{ height: '40px' }}
                  required
                >
                  <option value="">Select an organisation...</option>
                  {organisations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.email || 'No email'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.targetType === 'USER' && (
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
                  Select User Account *
                </label>
                <select
                  className="form-input"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  style={{ height: '40px' }}
                  required
                >
                  <option value="">Select a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Description / Internal Note (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. VIP client seasonal discount"
            />

            {!isEditing &&
              (formData.targetType === 'ORGANISATION' || formData.targetType === 'USER') && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    cursor: 'pointer',
                    backgroundColor: '#eff6ff',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.sendEmailToCustomer}
                    onChange={(e) =>
                      setFormData({ ...formData, sendEmailToCustomer: e.target.checked })
                    }
                  />
                  <Mail size={16} color="#2563eb" />
                  <span>Automatically dispatch coupon email to recipient upon creation</span>
                </label>
              )}

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
                {isEditing ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
