'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Save,
  Loader2,
  ShoppingBag,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { Organisation, OrganisationStatus, UpdateOrganisationDto } from '@ontime/shared';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Badge } from '../../../../components/ui/Badge';
import { useToast } from '../../../../components/ui/Toast';

function formatDate(dateInput?: string | Date): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrganisationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.id as string;
  const { success, error: toastError } = useToast();

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    taxNumber: '',
    pricingTier: 'TIER_1',
    status: OrganisationStatus.ACTIVE,
    address: '',
    area: '',
    city: '',
    contactPerson: '',
  });

  const loadOrganisation = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.getOrganisationById(orgId);
      if (res.success && res.data?.organisation) {
        const org = res.data.organisation;
        setOrganisation(org);
        setFormData({
          name: org.name || '',
          email: org.email || '',
          mobile: org.mobile || '',
          taxNumber: org.taxNumber || '',
          pricingTier: org.pricingTier || 'TIER_1',
          status: org.status || OrganisationStatus.ACTIVE,
          address: org.address || '',
          area: org.area || '',
          city: org.city || '',
          contactPerson: '',
        });
      } else {
        setActionError(res.error || 'Failed to load organisation details');
      }
    } catch {
      setActionError('Network connection error while fetching organisation');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrganisation();
  }, [loadOrganisation]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!formData.name.trim()) {
      setActionError('Organisation business name is required.');
      return;
    }

    if (!formData.email.trim()) {
      setActionError('Organisation email is required.');
      return;
    }

    if (!formData.taxNumber.trim()) {
      setActionError('TIN / Tax Number is mandatory (Requirement 2.A).');
      return;
    }

    setSaving(true);
    try {
      const dto: UpdateOrganisationDto = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        taxNumber: formData.taxNumber.trim(),
        pricingTier: formData.pricingTier,
        status: formData.status,
        ...(formData.mobile.trim() ? { mobile: formData.mobile.trim() } : {}),
        ...(formData.address.trim() ? { address: formData.address.trim() } : {}),
        ...(formData.area.trim() ? { area: formData.area.trim() } : {}),
        ...(formData.city.trim() ? { city: formData.city.trim() } : {}),
        ...(formData.contactPerson.trim() ? { contactPerson: formData.contactPerson.trim() } : {}),
      };

      const res = await api.updateOrganisation(orgId, dto);
      if (res.success && res.data?.organisation) {
        setOrganisation(res.data.organisation);
        setActionSuccess('Organisation profile updated successfully!');
        success('Organisation updated successfully');
      } else {
        const errMsg = res.error || 'Failed to update organisation details';
        setActionError(errMsg);
        toastError(errMsg);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error updating organisation';
      setActionError(errMsg);
      toastError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!organisation) return;
    const newStatus: OrganisationStatus =
      organisation.status === OrganisationStatus.ACTIVE
        ? OrganisationStatus.SUSPENDED
        : OrganisationStatus.ACTIVE;

    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.updateOrganisationStatus(organisation.id, newStatus);
      if (res.success) {
        success(`Organisation status updated to ${newStatus}`);
        setActionSuccess(`Organisation operational status changed to ${newStatus}.`);
        await loadOrganisation();
      } else {
        const errMsg = res.error || 'Failed to update organisation status';
        setActionError(errMsg);
        toastError(errMsg);
      }
    } catch {
      setActionError('Failed to change status');
      toastError('Failed to change status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <Loader2
          className="spinner"
          size={28}
          color="#2563eb"
          style={{ margin: '0 auto 12px auto' }}
        />
        <p style={{ fontWeight: 500 }}>Loading organisation details...</p>
      </div>
    );
  }

  if (!organisation) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link
          href="/organisations"
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            gap: '6px',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back to Organisations
        </Link>
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{actionError || 'Organisation not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Breadcrumb & Top Controls ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/organisations"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              height: '36px',
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Retailer Organisations</span>
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#0f172a',
            }}
          >
            {organisation.name}
          </span>
          <Badge
            variant={
              organisation.status === OrganisationStatus.ACTIVE
                ? 'success'
                : organisation.status === OrganisationStatus.SUSPENDED
                  ? 'warning'
                  : 'danger'
            }
          >
            {organisation.status}
          </Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={saving}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor:
                organisation.status === OrganisationStatus.ACTIVE ? '#fef2f2' : '#ecfdf5',
              color: organisation.status === OrganisationStatus.ACTIVE ? '#dc2626' : '#059669',
              border: `1px solid ${
                organisation.status === OrganisationStatus.ACTIVE ? '#fecaca' : '#a7f3d0'
              }`,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {organisation.status === OrganisationStatus.ACTIVE
              ? 'Suspend Organisation'
              : 'Activate Organisation'}
          </button>

          <Button
            variant="action-primary"
            onClick={handleSave}
            isLoading={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={16} />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {/* ── Feedback Banners ── */}
      {actionError && (
        <div className="alert-banner alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="alert-banner alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Main 2-Column Content ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Form Cards */}
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Card 1: Business Details */}
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
              <Building2 size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Business Profile
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Organisation / Business Name *"
                placeholder="e.g. Apex Retailers Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="TIN / Tax Number * (Mandatory)"
                  placeholder="e.g. GSTIN27AAAAA0000A1Z5"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  required
                />

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>Customer Wholesale Pricing Tier *</span>
                  </label>
                  <select
                    className="form-input"
                    value={formData.pricingTier}
                    onChange={(e) => setFormData({ ...formData, pricingTier: e.target.value })}
                    style={{ height: '40px' }}
                  >
                    <option value="TIER_1">Tier 1 (Base Wholesale)</option>
                    <option value="TIER_2">Tier 2 (Preferred Pricing)</option>
                    <option value="TIER_3">Tier 3 (VIP / Volume Pricing)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Operational Status</label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as OrganisationStatus })
                  }
                  style={{ height: '40px' }}
                >
                  <option value={OrganisationStatus.ACTIVE}>Active</option>
                  <option value={OrganisationStatus.SUSPENDED}>Suspended</option>
                  <option value={OrganisationStatus.INACTIVE}>Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Contact Information */}
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
              <Mail size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Contact Information
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Primary Business Email *"
                type="email"
                placeholder="contact@apexretailers.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Phone / Mobile Number"
                placeholder="+91 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
          </div>

          {/* Card 3: Location & Physical Address */}
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
              <MapPin size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Location & Physical Address
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Street Address"
                placeholder="e.g. 101 Commercial Street, Suite 4B"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Area / District"
                  placeholder="e.g. Bandra West"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
                <Input
                  label="City / Town"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link
              href="/organisations"
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.875rem', textDecoration: 'none' }}
            >
              Cancel
            </Link>
            <Button
              variant="action-primary"
              type="submit"
              isLoading={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>

        {/* Right Column: Summary & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Organisation Card */}
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
                gap: '12px',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                }}
              >
                {organisation.name[0]?.toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                  {organisation.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>
                  ID: {organisation.id}
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
              >
                <span style={{ color: '#64748b' }}>Pricing Tier:</span>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>
                  {formData.pricingTier === 'TIER_1'
                    ? 'Tier 1 (Base)'
                    : formData.pricingTier === 'TIER_2'
                      ? 'Tier 2 (Preferred)'
                      : 'Tier 3 (VIP)'}
                </span>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
              >
                <span style={{ color: '#64748b' }}>TIN / Tax ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#334155' }}>
                  {formData.taxNumber || '—'}
                </span>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
              >
                <span style={{ color: '#64748b' }}>Status:</span>
                <Badge
                  variant={
                    formData.status === OrganisationStatus.ACTIVE
                      ? 'success'
                      : formData.status === OrganisationStatus.SUSPENDED
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {formData.status}
                </Badge>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
              >
                <span style={{ color: '#64748b' }}>Onboarded:</span>
                <span
                  style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Calendar size={13} color="#94a3b8" />
                  {formatDate(organisation.createdAt)}
                </span>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
              >
                <span style={{ color: '#64748b' }}>Last Profile Update:</span>
                <span style={{ color: '#334155' }}>{formatDate(organisation.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Quick Links Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
            }}
          >
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Customer Actions & Reports
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => router.push(`/orders?orgFilter=${organisation.id}`)}
                className="btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <ShoppingBag size={15} color="#2563eb" />
                <span>View Wholesale Orders</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/reports')}
                className="btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <BarChart3 size={15} color="#16a34a" />
                <span>Purchase History Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
