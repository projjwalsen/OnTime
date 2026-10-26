'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, MapPin, PlusCircle, AlertCircle } from 'lucide-react';
import { api } from '../../../../lib/api';
import { CreateOrganisationDto } from '@ontime/shared';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { useToast } from '../../../../components/ui/Toast';

export default function OnboardRetailerPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    taxNumber: '',
    pricingTier: 'TIER_1',
    address: '',
    area: '',
    city: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Organisation business name is required.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Business email address is required.');
      return;
    }

    if (!formData.taxNumber.trim()) {
      setErrorMessage('TIN / Tax Number is mandatory (Requirement 2.A).');
      return;
    }

    setCreating(true);
    try {
      const dto: CreateOrganisationDto = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        taxNumber: formData.taxNumber.trim(),
        pricingTier: formData.pricingTier || 'TIER_1',
        ...(formData.mobile.trim() ? { mobile: formData.mobile.trim() } : {}),
        ...(formData.address.trim() ? { address: formData.address.trim() } : {}),
        ...(formData.area.trim() ? { area: formData.area.trim() } : {}),
        ...(formData.city.trim() ? { city: formData.city.trim() } : {}),
      };

      const res = await api.createOrganisation(dto);
      if (res.success && res.data?.organisation) {
        success(`Organisation "${formData.name}" created successfully!`);
        router.push(`/organisations/${res.data.organisation.id}`);
      } else {
        const err = res.error || 'Failed to create organisation';
        setErrorMessage(err);
        toastError(err);
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(errStr);
      toastError(errStr);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ paddingBottom: '3rem', maxWidth: '960px' }}>
      {/* ── Breadcrumb & Top Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
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
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#64748b' }}>
            Onboard New Retailer
          </span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          Onboard New Retailer Organisation
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
          Register a customer business profile, set tax credentials, and assign wholesale pricing
          tier.
        </p>
      </div>

      {errorMessage && (
        <div className="alert-banner alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        {/* Card 1: Business Profile */}
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
              Business Profile & Identification
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Organisation Business Name *"
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
                <label className="form-label">Customer Wholesale Pricing Tier *</label>
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
              label="Contact Phone / Mobile"
              placeholder="+91 9876543210"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
          </div>
        </div>

        {/* Card 3: Location Details */}
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
              Physical Location & Address
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

        {/* Action Buttons */}
        <div
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.5rem' }}
        >
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
            isLoading={creating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={16} />
            <span>Create Retailer Organisation</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
