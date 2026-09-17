'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/orders': 'Wholesale Orders',
  '/organisations': 'Retailer Organisations',
  '/products': 'Product Catalog',
  '/categories': 'Category Management',
  '/reports': 'Reports & Analytics',
  '/users': 'Platform Users',
  '/settings': 'Admin Settings & Security',
};

export function TopNav() {
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

  const pageTitle = PAGE_TITLES[pathname] || 'Distributor Admin Portal';

  return (
    <header className="admin-topbar">
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{pageTitle}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

        {/* User Avatar Button & Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: `1px solid ${isDropdownOpen ? '#93c5fd' : '#e2e8f0'}`,
              backgroundColor: isDropdownOpen ? '#eff6ff' : '#f8fafc',
              color: isDropdownOpen ? '#2563eb' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="User Profile & Settings"
          >
            <UserIcon size={18} />
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
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow:
                  '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'slideUp 0.15s ease',
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
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                  {user?.name || 'Platform Admin'}
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
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}
                >
                  <ShieldCheck size={12} color="#059669" />
                  <span
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      color: '#059669',
                      backgroundColor: '#ecfdf5',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    SUPER_ADMIN
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div style={{ padding: '6px' }}>
                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    color: '#334155',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <Settings size={15} color="#64748b" />
                  <span>Admin Settings</span>
                </Link>

                <div
                  style={{
                    height: '1px',
                    backgroundColor: '#e2e8f0',
                    margin: '4px 0',
                  }}
                />

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    color: '#dc2626',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={15} color="#dc2626" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
