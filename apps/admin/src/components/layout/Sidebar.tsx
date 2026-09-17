'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Package,
  Layers,
  BarChart3,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/organisations', icon: Building2 },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Categories', href: '/categories', icon: Layers },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar" data-node-id="4:48" data-name="Sidebar">
      {/* Brand Header */}
      <div
        style={{
          padding: '1.5rem 1.25rem 1.25rem',
          borderBottom: '1px solid var(--border-figma)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '-0.02em',
          }}
        >
          D
        </div>
        <div>
          <h1
            data-node-id="4:49"
            style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            DISTRIBUTOR
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
            Order Management
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          padding: '1rem 0.65rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
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
              data-node-id={isActive ? '4:50' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '7px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0f172a' : '#475569',
                backgroundColor: isActive ? 'var(--bg-figma-active)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon
                size={17}
                color={isActive ? '#0f172a' : '#64748b'}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
