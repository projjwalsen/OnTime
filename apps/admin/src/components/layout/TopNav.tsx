'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, Settings, ChevronRight, Menu, Bell, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_METADATA: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Business activity overview' },
  '/orders': { title: 'Wholesale Orders', subtitle: 'Track and process wholesale orders' },
  '/organisations': {
    title: 'Retailer Organisations',
    subtitle: 'Manage registered retail businesses',
  },
  '/products': { title: 'Product Catalog', subtitle: 'Manage SKUs, pack sizes and inventory' },
  '/categories': {
    title: 'Category Management',
    subtitle: 'Product categories and classifications',
  },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Order trends, fulfillment and revenue' },
  '/users': { title: 'Platform Users', subtitle: 'Manage team access, permissions and roles' },
  '/settings': {
    title: 'Admin Settings & Security',
    subtitle: 'System preferences, tax and policies',
  },
};

interface TopNavProps {
  isCollapsed?: boolean;
  onToggleMobile?: () => void;
}

export function TopNav({ onToggleMobile }: TopNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close dropdown on ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Determine current page title
  let currentMeta = PAGE_METADATA[pathname];
  if (!currentMeta) {
    if (pathname.startsWith('/orders/')) {
      currentMeta = { title: 'Order Details', subtitle: 'View line items & fulfillment' };
    } else {
      currentMeta = { title: 'Admin Portal', subtitle: 'OnTime Management' };
    }
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AD';

  return (
    <header className="admin-topbar">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onToggleMobile && (
          <button
            type="button"
            onClick={onToggleMobile}
            className="admin-mobile-menu-btn"
            title="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Breadcrumb Navigation (Jivanjor Style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <Link
            href="/dashboard"
            style={{
              color: pathname === '/dashboard' ? '#0f172a' : '#64748b',
              fontWeight: pathname === '/dashboard' ? 700 : 500,
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = pathname === '/dashboard' ? '#0f172a' : '#64748b')
            }
          >
            Dashboard
          </Link>

          {pathname !== '/dashboard' && (
            <>
              <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{currentMeta.title}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions, Badges & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notification Bell */}
        <button
          type="button"
          title="Notifications"
          style={{
            position: 'relative',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          <Bell size={17} />
          {/* Notification Indicator Dot */}
          <span
            style={{
              position: 'absolute',
              top: '9px',
              right: '9px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              boxShadow: '0 0 0 2px #ffffff',
            }}
          />
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: `1px solid ${isDropdownOpen ? '#93c5fd' : '#e2e8f0'}`,
              backgroundColor: isDropdownOpen ? '#eff6ff' : '#f8fafc',
              color: isDropdownOpen ? '#2563eb' : '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="User Profile & Settings"
          >
            {userInitials}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow:
                  '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* User Header Info */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  {user?.name || 'Administrator'}
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {user?.email}
                </p>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                    fontSize: '0.6875rem',
                    color: '#059669',
                    fontWeight: 600,
                  }}
                >
                  <ShieldCheck size={12} />
                  <span>Super Administrator</span>
                </div>
              </div>

              {/* Links */}
              <div style={{ padding: '6px' }}>
                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: '#334155',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={15} style={{ color: '#64748b' }} />
                  <span>Platform Settings</span>
                </Link>

                <Link
                  href="/users"
                  onClick={() => setIsDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: '#334155',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Users size={15} style={{ color: '#64748b' }} />
                  <span>Team & Users</span>
                </Link>
              </div>

              {/* Logout Button */}
              <div style={{ padding: '6px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#dc2626',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
