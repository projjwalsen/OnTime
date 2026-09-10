'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Shield, Building, Phone, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { User, Organisation, UserRole } from '@ontime/shared';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';

export default function UsersPage() {
  const { error: toastError } = useToast();

  const [users, setUsers] = useState<(User & { organisation?: Organisation | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      if (res.success && res.data) {
        setUsers(res.data.users);
      }
    } catch {
      toastError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, toastError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <Badge variant="primary">SUPER_ADMIN</Badge>;
      case UserRole.ADMIN:
        return <Badge variant="warning">ADMIN</Badge>;
      case UserRole.STAFF:
        return <Badge variant="success">STAFF</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Platform Users</h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
          Overview of platform super admins, organisation admins, and staff
        </p>
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
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Organisation / Tenant</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Joined Date</th>
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
                    <span>Loading platform users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No users found</p>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: u.role === UserRole.SUPER_ADMIN ? '#eff6ff' : '#f1f5f9',
                          color: u.role === UserRole.SUPER_ADMIN ? '#2563eb' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {u.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                          {u.name}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    {u.organisation ? (
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
                        <Building size={14} color="#64748b" />
                        {u.organisation.name}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          color: '#2563eb',
                          fontWeight: 600,
                        }}
                      >
                        <Shield size={14} />
                        Distributor (Platform Owner)
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {u.mobile ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {u.mobile}
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant={u.isActive ? 'success' : 'danger'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
