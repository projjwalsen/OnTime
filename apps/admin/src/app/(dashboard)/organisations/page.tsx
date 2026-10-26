'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Loader2, Phone, Mail, Edit } from 'lucide-react';
import { api } from '../../../lib/api';
import { Organisation, OrganisationStatus } from '@ontime/shared';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { Pagination } from '../../../components/ui/Pagination';

export default function OrganisationsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganisationStatus | ''>('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrganisations({
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      if (res.success && res.data) {
        setOrganisations(res.data.organisations);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      } else {
        toastError(res.error || 'Failed to load organisations');
      }
    } catch {
      toastError('Network error while loading organisations');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, toastError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganisations();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOrganisations]);

  const handleUpdateTier = async (orgId: string, pricingTier: string) => {
    try {
      const res = await api.updateOrganisation(orgId, { pricingTier });
      if (res.success) {
        success(`Customer pricing tier updated to ${pricingTier}`);
        fetchOrganisations();
      } else {
        toastError(res.error || 'Failed to update pricing tier');
      }
    } catch {
      toastError('Failed to update pricing tier');
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

        <Link
          href="/organisations/new"
          className="btn-action-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
          }}
        >
          <Plus size={16} />
          <span>Onboard New Retailer</span>
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
              placeholder="Search by organisation name, email or city..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>Status:</span>
          <select
            className="form-input"
            style={{ width: 'auto', height: '40px', padding: '0 10px', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrganisationStatus | '');
              setPage(1);
            }}
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
              <th>TIN / Tax No</th>
              <th>Pricing Tier</th>
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
                <tr
                  key={org.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/organisations/${org.id}`)}
                >
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
                          flexShrink: 0,
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
                  <td style={{ maxWidth: '210px' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        fontSize: '0.76rem',
                        lineHeight: '1.25',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#334155',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={org.email}
                      >
                        <Mail size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {org.email}
                        </span>
                      </span>
                      {org.mobile && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Phone size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                          <span>{org.mobile}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        fontWeight: 500,
                      }}
                    >
                      {org.taxNumber || '—'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="form-input"
                      style={{
                        height: '32px',
                        padding: '0 8px',
                        fontSize: '0.8rem',
                        width: 'auto',
                        fontWeight: 600,
                        color: '#1d4ed8',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        cursor: 'pointer',
                      }}
                      value={org.pricingTier || 'TIER_1'}
                      onChange={(e) => handleUpdateTier(org.id, e.target.value)}
                      title="Assign customer wholesale pricing tier"
                    >
                      <option value="TIER_1">Tier 1 (Base)</option>
                      <option value="TIER_2">Tier 2</option>
                      <option value="TIER_3">Tier 3</option>
                    </select>
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
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Link
                        href={`/organisations/${org.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                        title="View & Edit Organisation Details"
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(org)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor:
                            org.status === OrganisationStatus.ACTIVE ? '#fef2f2' : '#ecfdf5',
                          color: org.status === OrganisationStatus.ACTIVE ? '#dc2626' : '#059669',
                          border: `1px solid ${
                            org.status === OrganisationStatus.ACTIVE ? '#fecaca' : '#a7f3d0'
                          }`,
                          cursor: 'pointer',
                        }}
                      >
                        {org.status === OrganisationStatus.ACTIVE ? 'Suspend' : 'Activate'}
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
          pageSizeOptions={[10, 20, 50, 100]}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
