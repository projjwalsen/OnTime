'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Package,
  BarChart3,
  UserCheck,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LogOut,
  X,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/organisations', icon: Building2 },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Users', href: '/users', icon: UserCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Auto-expand catalog submenu if currently on products or categories
  useEffect(() => {
    if (pathname.startsWith('/products') || pathname.startsWith('/categories')) {
      setCatalogOpen(true);
    }
  }, [pathname]);

  const isCatalogActive = pathname.startsWith('/products') || pathname.startsWith('/categories');

  const renderNavList = (mobile = false) => (
    <nav
      style={{
        padding: isCollapsed && !mobile ? '1rem 0.5rem' : '1.25rem 0.75rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto',
      }}
    >
      {/* Primary items */}
      {PRIMARY_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        if (isCollapsed && !mobile) {
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                margin: '0 auto',
                borderRadius: '10px',
                backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={20} />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={mobile && onCloseMobile ? onCloseMobile : () => {}}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#2563eb' : '#475569',
              backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            }}
          >
            <Icon size={18} style={{ color: isActive ? '#2563eb' : '#64748b' }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {isActive && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                }}
              />
            )}
          </Link>
        );
      })}

      {/* Catalog Group (Collapsible Submenu - Jivanjor style) */}
      {isCollapsed && !mobile ? (
        <Link
          href="/products"
          title="Catalog (Products & Categories)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            margin: '0 auto',
            borderRadius: '10px',
            backgroundColor: isCatalogActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: isCatalogActive ? '#2563eb' : '#64748b',
            transition: 'all 0.2s ease',
          }}
        >
          <Package size={20} />
        </Link>
      ) : (
        <div style={{ marginTop: '2px', marginBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setCatalogOpen((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: isCatalogActive ? 700 : 500,
              color: isCatalogActive ? '#2563eb' : '#475569',
              backgroundColor: isCatalogActive ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
              cursor: 'pointer',
              border: 'none',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <Package size={18} style={{ color: isCatalogActive ? '#2563eb' : '#64748b' }} />
            <span style={{ flex: 1 }}>Catalog</span>
            <ChevronRight
              size={15}
              style={{
                color: '#94a3b8',
                transition: 'transform 0.2s ease',
                transform: catalogOpen ? 'rotate(90deg)' : 'none',
              }}
            />
          </button>

          {catalogOpen && (
            <div
              style={{
                position: 'relative',
                paddingLeft: '34px',
                paddingRight: '6px',
                paddingTop: '4px',
                paddingBottom: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                marginTop: '2px',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* Vertical Branch Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '23px',
                  top: '4px',
                  bottom: '12px',
                  width: '1.5px',
                  backgroundColor: '#e2e8f0',
                }}
              />

              <Link
                href="/products"
                onClick={mobile && onCloseMobile ? onCloseMobile : () => {}}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  fontSize: '0.8125rem',
                  fontWeight: pathname === '/products' ? 700 : 500,
                  color: pathname === '/products' ? '#2563eb' : '#64748b',
                  backgroundColor: pathname === '/products' ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: pathname === '/products' ? '#2563eb' : '#cbd5e1',
                  }}
                />
                <span>Products</span>
              </Link>

              <Link
                href="/categories"
                onClick={mobile && onCloseMobile ? onCloseMobile : () => {}}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  fontSize: '0.8125rem',
                  fontWeight: pathname === '/categories' ? 700 : 500,
                  color: pathname === '/categories' ? '#2563eb' : '#64748b',
                  backgroundColor: pathname === '/categories' ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: pathname === '/categories' ? '#2563eb' : '#cbd5e1',
                  }}
                />
                <span>Categories</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Secondary items */}
      {SECONDARY_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        if (isCollapsed && !mobile) {
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                margin: '0 auto',
                borderRadius: '10px',
                backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={20} />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={mobile && onCloseMobile ? onCloseMobile : () => {}}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#2563eb' : '#475569',
              backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            }}
          >
            <Icon size={18} style={{ color: isActive ? '#2563eb' : '#64748b' }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {isActive && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Header */}
        {isCollapsed ? (
          <div
            style={{
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand Sidebar"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        ) : (
          <div
            style={{
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '-0.02em',
                  flexShrink: 0,
                }}
              >
                OT
              </div>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  OnTime
                </h1>
                <p
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginTop: '2px',
                  }}
                >
                  Distributor Portal
                </p>
              </div>
            </div>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>
        )}

        {/* Navigation List */}
        {renderNavList(false)}
      </aside>

      {/* ── Mobile Responsive Drawer ── */}
      {isMobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={onCloseMobile}
        >
          <div
            style={{
              width: '272px',
              height: '100%',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              animation: 'slideInLeft 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
            <div
              style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.25rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  OT
                </div>
                <div>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>OnTime</h2>
                  <p
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      color: '#2563eb',
                      textTransform: 'uppercase',
                    }}
                  >
                    Distributor Portal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseMobile}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile Navigation List */}
            {renderNavList(true)}

            {/* Mobile Footer */}
            <div
              style={{
                padding: '1rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onCloseMobile?.();
                  logout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '9px',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
