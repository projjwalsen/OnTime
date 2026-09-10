'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Activity, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/organisations': 'Retailer Organisations',
  '/products': 'Product Catalog',
  '/categories': 'Category Management',
  '/users': 'Platform Users',
  '/settings': 'Admin Settings & Security',
};

export function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const res = await api.checkHealth();
        if (isMounted) {
          setIsBackendHealthy(res.success && res.data?.status === 'ok');
        }
      } catch {
        if (isMounted) setIsBackendHealthy(false);
      }
    }

    void checkHealth();
    const interval = setInterval(() => {
      void checkHealth();
    }, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const pageTitle = PAGE_TITLES[pathname] || 'Distributor Admin Portal';

  return (
    <header className="admin-topbar">
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{pageTitle}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Backend Health Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 500,
            backgroundColor:
              isBackendHealthy === true
                ? '#ecfdf5'
                : isBackendHealthy === false
                  ? '#fef2f2'
                  : '#f8fafc',
            color:
              isBackendHealthy === true
                ? '#065f46'
                : isBackendHealthy === false
                  ? '#991b1b'
                  : '#64748b',
            border: `1px solid ${isBackendHealthy === true ? '#a7f3d0' : isBackendHealthy === false ? '#fecaca' : '#e2e8f0'}`,
          }}
          title={isBackendHealthy ? 'Backend API connected' : 'Backend API check failed'}
        >
          <Activity
            size={13}
            color={
              isBackendHealthy ? '#10b981' : isBackendHealthy === false ? '#ef4444' : '#94a3b8'
            }
          />
          <span>
            {isBackendHealthy
              ? 'API Online'
              : isBackendHealthy === false
                ? 'API Offline'
                : 'Checking API...'}
          </span>
        </div>

        {/* Distributor Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={14} color="#2563eb" />
          <span>Distributor Admin</span>
        </div>

        {/* User Mini Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <UserIcon size={16} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
            {user?.email || 'admin@ontime.com'}
          </span>
        </div>
      </div>
    </header>
  );
}
