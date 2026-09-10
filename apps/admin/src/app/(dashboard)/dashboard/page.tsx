'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Package,
  Layers,
  Users,
  ArrowUpRight,
  Plus,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { api } from '../../../lib/api';
import { Organisation, OrganisationStatus } from '@ontime/shared';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    organisationsCount: 0,
    productsCount: 0,
    categoriesCount: 0,
    usersCount: 0,
  });
  const [recentOrganisations, setRecentOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [orgsRes, prodsRes, catsRes, usersRes] = await Promise.all([
          api.getOrganisations({ limit: 5 }),
          api.getProducts({ limit: 1 }),
          api.getCategories(),
          api.getUsers({ limit: 1 }),
        ]);

        setStats({
          organisationsCount: orgsRes.data?.pagination.total || 0,
          productsCount: prodsRes.data?.pagination.total || 0,
          categoriesCount: catsRes.data?.categories.length || 0,
          usersCount: usersRes.data?.pagination.total || 0,
        });

        if (orgsRes.data?.organisations) {
          setRecentOrganisations(orgsRes.data.organisations);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '2rem 2.5rem',
          color: '#ffffff',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
            }}
          >
            DISTRIBUTOR CONTROL CENTER
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
            Welcome to OnTime Admin
          </h1>
          <p style={{ marginTop: '0.5rem', opacity: 0.9, fontSize: '0.95rem' }}>
            Manage retailer organisations, products, categories, and distributor platform settings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href="/organisations"
            className="btn-primary"
            style={{
              backgroundColor: '#ffffff',
              color: '#1e40af',
              height: '42px',
              padding: '0 1.25rem',
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <Plus size={16} />
            <span>Onboard Retailer</span>
          </Link>
          <Link
            href="/products"
            className="btn-primary"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              height: '42px',
              padding: '0 1.25rem',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Retailer Orgs</span>
            <span className="stat-value">{loading ? '—' : stats.organisationsCount}</span>
          </div>
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}
          >
            <Building2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Catalog Products</span>
            <span className="stat-value">{loading ? '—' : stats.productsCount}</span>
          </div>
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}
          >
            <Package size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Categories</span>
            <span className="stat-value">{loading ? '—' : stats.categoriesCount}</span>
          </div>
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
          >
            <Layers size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Platform Users</span>
            <span className="stat-value">{loading ? '—' : stats.usersCount}</span>
          </div>
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}
          >
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Retailers & System Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Recent Retailer Organisations Table */}
        <div className="table-container">
          <div className="table-header-bar">
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Retailer Organisations
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Recently registered or active customer accounts
              </p>
            </div>
            <Link
              href="/organisations"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem',
                color: '#2563eb',
                fontWeight: 600,
              }}
            >
              <span>View all</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>City / Area</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentOrganisations.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}
                  >
                    {loading
                      ? 'Loading organisations...'
                      : 'No organisations found. Onboard your first retailer.'}
                  </td>
                </tr>
              ) : (
                recentOrganisations.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div>
                        <strong style={{ color: '#0f172a', fontWeight: 600 }}>{org.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{org.email}</div>
                      </div>
                    </td>
                    <td>
                      <span>{org.city || '—'}</span>
                      {org.area && (
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>, {org.area}</span>
                      )}
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
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Diagnostics & Platform Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}
            >
              <Activity size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Platform Status
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Distributor Mode</span>
                <Badge variant="primary" showDot={false}>
                  Exclusive
                </Badge>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>RBAC Enforced</span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85rem',
                    color: '#10b981',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={15} /> Active
                </span>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>API Version</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>v1</span>
              </div>
            </div>
          </Card>

          <Card style={{ backgroundColor: '#f8fafc' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              Admin Guidance
            </h4>
            <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
              Only Distributor Admins can manage catalog products, categories, and onboard customer
              organisations.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
