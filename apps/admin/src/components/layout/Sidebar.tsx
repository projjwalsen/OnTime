'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Package,
  Layers,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Retailers', href: '/organisations', icon: Building2 },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Categories', href: '/categories', icon: Layers },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="admin-sidebar">
      {/* Brand Header */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.1rem',
          }}
        >
          O
        </div>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            OnTime
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
            Distributor Admin
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          padding: '1rem 0.75rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563eb' : '#475569',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                transition: 'all 150ms ease',
              }}
            >
              <Icon size={18} color={isActive ? '#2563eb' : '#64748b'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Role & User Footer */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e40af',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {user?.name ? user.name[0]?.toUpperCase() : 'A'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {user?.name || 'Distributor Admin'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <ShieldCheck size={12} color="#2563eb" />
              <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                DISTRIBUTOR_ADMIN
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '6px',
            fontSize: '0.825rem',
            fontWeight: 500,
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
