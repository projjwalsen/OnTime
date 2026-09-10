'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { api } from '../../../lib/api';
import { Organisation, OrganisationStatus, CreateOrganisationDto } from '@ontime/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';

export default function OrganisationsPage() {
  const { success, error: toastError } = useToast();

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganisationStatus | ''>('');

  // Create Org Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    area: '',
    city: '',
    taxNumber: '',
  });

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrganisations({
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      if (res.success && res.data) {
        setOrganisations(res.data.organisations);
      } else {
        toastError(res.error || 'Failed to load organisations');
      }
    } catch {
      toastError('Network error while loading organisations');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, toastError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganisations();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOrganisations]);

  const handleCreateOrganisation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toastError('Organisation name and email are required');
      return;
    }

    setCreating(true);
    try {
      const dto: CreateOrganisationDto = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        ...(formData.mobile.trim() ? { mobile: formData.mobile.trim() } : {}),
        ...(formData.address.trim() ? { address: formData.address.trim() } : {}),
        ...(formData.area.trim() ? { area: formData.area.trim() } : {}),
        ...(formData.city.trim() ? { city: formData.city.trim() } : {}),
        ...(formData.taxNumber.trim() ? { taxNumber: formData.taxNumber.trim() } : {}),
      };

      const res = await api.createOrganisation(dto);
      if (res.success) {
        success(`Organisation "${formData.name}" created successfully!`);
        setIsModalOpen(false);
        setFormData({
          name: '',
          email: '',
          mobile: '',
          address: '',
          area: '',
          city: '',
          taxNumber: '',
        });
        fetchOrganisations();
      } else {
        toastError(res.error || 'Failed to create organisation');
      }
    } catch {
      toastError('An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (org: Organisation) => {
    const newStatus: OrganisationStatus =
      org.status === OrganisationStatus.ACTIVE
        ? OrganisationStatus.SUSPENDED
        : OrganisationStatus.ACTIVE;

    try {
      const res = await api.updateOrganisationStatus(org.id, newStatus);
      if (res.success) {
        success(`Organisation status updated to ${newStatus}`);
        fetchOrganisations();
      } else {
        toastError(res.error || 'Failed to update organisation status');
      }
    } catch {
      toastError('Failed to change status');
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Retailer Organisations
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
            Onboard, review, and manage customer retailer businesses
          </p>
        </div>

        <Button variant="action-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Onboard New Retailer</span>
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
              placeholder="Search by organisation name, email or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>Status:</span>
          <select
            className="form-input"
            style={{ width: 'auto', height: '40px', padding: '0 10px', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrganisationStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Organisations Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Contact Details</th>
              <th>Location</th>
              <th>Tax Number</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
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
                    <span>Loading retailer organisations...</span>
                  </div>
                </td>
              </tr>
            ) : organisations.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No organisations found</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Try adjusting your search criteria or onboard a new retailer organisation.
                  </p>
                </td>
              </tr>
            ) : (
              organisations.map((org) => (
                <tr key={org.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        {org.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                          {org.name}
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ID: {org.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        fontSize: '0.825rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#334155',
                        }}
                      >
                        <Mail size={13} color="#94a3b8" /> {org.email}
                      </span>
                      {org.mobile && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#64748b',
                          }}
                        >
                          <Phone size={13} color="#94a3b8" /> {org.mobile}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        fontSize: '0.825rem',
                      }}
                    >
                      <MapPin size={14} color="#94a3b8" style={{ marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 500, color: '#334155' }}>{org.city || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {org.area ? `${org.area}, ` : ''}
                          {org.address || ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{ fontSize: '0.825rem', fontFamily: 'monospace', color: '#475569' }}
                    >
                      {org.taxNumber || '—'}
                    </span>
                  </td>
                  <td>
                    <Badge
                      variant={
                        org.status === OrganisationStatus.ACTIVE
                          ? 'success'
                          : org.status === OrganisationStatus.SUSPENDED
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {org.status}
                    </Badge>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(org)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backgroundColor:
                          org.status === OrganisationStatus.ACTIVE ? '#fef2f2' : '#ecfdf5',
                        color: org.status === OrganisationStatus.ACTIVE ? '#dc2626' : '#059669',
                        border: `1px solid ${org.status === OrganisationStatus.ACTIVE ? '#fecaca' : '#a7f3d0'}`,
                      }}
                    >
                      {org.status === OrganisationStatus.ACTIVE ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Onboard Organisation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Onboard Retailer Organisation"
        maxWidth="600px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateOrganisation}
              isLoading={creating}
              style={{ width: 'auto' }}
            >
              Create Organisation
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleCreateOrganisation}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <Input
            label="Organisation Business Name *"
            placeholder="e.g. Apex Retailers Ltd"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Business Email *"
              type="email"
              placeholder="contact@apexretailers.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="+91 9876543210"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="City"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Area / District"
              placeholder="e.g. Bandra West"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            />
          </div>

          <Input
            label="Street Address"
            placeholder="e.g. 101 Commercial Street, Suite 4B"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Tax / GST Number"
            placeholder="e.g. GSTIN27AAAAA0000A1Z5"
            value={formData.taxNumber}
            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
