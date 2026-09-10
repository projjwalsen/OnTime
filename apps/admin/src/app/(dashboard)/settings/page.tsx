'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE_URL } from '../../../lib/config';

export default function SettingsPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Health Stats
  const [healthData, setHealthData] = useState<{
    status: string;
    uptime?: number;
    timestamp?: string;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    async function getHealth() {
      setHealthLoading(true);
      try {
        const res = await api.checkHealth();
        if (res.success && res.data) {
          setHealthData(res.data);
        } else {
          setHealthData({ status: 'offline' });
        }
      } catch {
        setHealthData({ status: 'offline' });
      } finally {
        setHealthLoading(false);
      }
    }

    void getHealth();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toastError('Please enter your current password');
      return;
    }

    if (newPassword.length < 8) {
      toastError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toastError(res.error || 'Failed to update password');
      }
    } catch {
      toastError('An unexpected error occurred while changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          Settings & Security
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
          Manage your distributor account credentials and check platform infrastructure
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Admin Profile & Security Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Card */}
          <Card>
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
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                  Distributor Profile
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Authenticated administrator session
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Full Name</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  {user?.name || 'Distributor Admin'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Email Address</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  {user?.email || 'admin@ontime.com'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Access Role</span>
                <Badge variant="primary" showDot={false}>
                  DISTRIBUTOR_ADMIN
                </Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Account Scope</span>
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                  Global Platform Access
                </span>
              </div>
            </div>
          </Card>

          {/* Change Password Card */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <Key size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                Update Password
              </h3>
            </div>

            <form
              onSubmit={handleChangePassword}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="New Password (min 8 characters)"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={changingPassword}
                style={{ width: 'auto', alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Platform Diagnostics & Environment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <Server size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                API & Environment Diagnostics
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Backend Base URL</span>
                <span style={{ fontSize: '0.825rem', fontFamily: 'monospace', color: '#0f172a' }}>
                  {API_BASE_URL}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Backend Service Status
                </span>
                {healthLoading ? (
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Checking...</span>
                ) : healthData?.status === 'ok' ? (
                  <Badge variant="success">Operational</Badge>
                ) : (
                  <Badge variant="danger">Disconnected</Badge>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Uptime</span>
                <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                  {healthData?.uptime ? `${Math.floor(healthData.uptime)} seconds` : '—'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Security Architecture</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
                  Distributor-Only Gateway
                </span>
              </div>
            </div>
          </Card>

          <Card style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <AlertCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e40af' }}>
                  Security & Data Ownership Model
                </h4>
                <p
                  style={{
                    fontSize: '0.825rem',
                    color: '#1e3a8a',
                    marginTop: '4px',
                    lineHeight: 1.5,
                  }}
                >
                  This dashboard enforces multi-organisation isolation at the backend API layer.
                  Distributor Admins have global authority to onboard retailers, maintain master
                  catalogs, and supervise order flows.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
