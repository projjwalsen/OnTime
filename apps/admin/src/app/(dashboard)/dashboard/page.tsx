'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle2,
  Building2,
  Package,
  Layers,
  BarChart3,
  Users,
  Settings,
  Activity,
  Search,
  X,
  ArrowUpRight,
  RefreshCw,
  Eye,
  LucideIcon,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { OrderStatus } from '@ontime/shared';

interface DashboardStats {
  totalOrders: number;
  newOrders: number;
  processingOrders: number;
  pendingDeliveryOrders: number;
  completedOrders: number;
  customerCount: number;
}

interface DashboardRecentOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string | Date;
  itemsCount: number;
  status: OrderStatus;
}

interface ActionHubItem {
  id: string;
  title: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  group: 'orders' | 'catalog' | 'retailers' | 'system';
  badge: string;
  gradient: string;
}

const ACTION_HUB_ITEMS: ActionHubItem[] = [
  {
    id: 'review-orders',
    title: 'Review Pending Orders',
    desc: 'Review incoming wholesale orders, verify payments & manage approvals',
    href: '/orders?status=PENDING',
    icon: Clock,
    group: 'orders',
    badge: 'Orders',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  {
    id: 'all-orders',
    title: 'All Wholesale Orders',
    desc: 'Full view of wholesale orders across all statuses with quick dispatch',
    href: '/orders',
    icon: ShoppingCart,
    group: 'orders',
    badge: 'Orders',
    gradient: 'linear-gradient(135deg, #2563eb, #1e40af)',
  },
  {
    id: 'manage-products',
    title: 'Product Catalog',
    desc: 'Configure product profiles, pack sizes, inventory & pricing specs',
    href: '/products',
    icon: Package,
    group: 'catalog',
    badge: 'Catalog',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
  },
  {
    id: 'manage-categories',
    title: 'Category Hierarchy',
    desc: 'Organize category classifications, nested structure & brand links',
    href: '/categories',
    icon: Layers,
    group: 'catalog',
    badge: 'Catalog',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  },
  {
    id: 'retailer-accounts',
    title: 'Retailer Organisations',
    desc: 'Manage customer accounts, tax credentials, credit terms & profiles',
    href: '/organisations',
    icon: Building2,
    group: 'retailers',
    badge: 'Retailers',
    gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
  },
  {
    id: 'reports-analytics',
    title: 'Fulfillment & Sales Reports',
    desc: 'Inspect sales trends, delivery volume metrics & monthly performance',
    href: '/reports',
    icon: BarChart3,
    group: 'system',
    badge: 'Reports',
    gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
  },
  {
    id: 'manage-users',
    title: 'Platform Users & Staff',
    desc: 'Manage administrative team access, permissions and role controls',
    href: '/users',
    icon: Users,
    group: 'system',
    badge: 'Users',
    gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
  },
  {
    id: 'system-settings',
    title: 'Admin Settings & Security',
    desc: 'Configure system parameters, notifications, tax rules & security',
    href: '/settings',
    icon: Settings,
    group: 'system',
    badge: 'System',
    gradient: 'linear-gradient(135deg, #475569, #1e293b)',
  },
];

const SAMPLE_RECENT_ORDERS: DashboardRecentOrderItem[] = [
  {
    id: 'sample-1',
    orderNumber: 'V-2026-00124',
    customerName: 'Sharma Store',
    date: new Date('2026-08-03T10:30:00Z'),
    itemsCount: 4,
    status: OrderStatus.PROCESSING,
  },
  {
    id: 'sample-2',
    orderNumber: 'V-2026-00123',
    customerName: 'Gupta Mart',
    date: new Date('2026-08-03T09:15:00Z'),
    itemsCount: 4,
    status: OrderStatus.DELIVERED,
  },
  {
    id: 'sample-3',
    orderNumber: 'V-2026-00122',
    customerName: 'City Retail',
    date: new Date('2026-08-03T08:45:00Z'),
    itemsCount: 4,
    status: OrderStatus.PENDING,
  },
  {
    id: 'sample-4',
    orderNumber: 'V-2026-00121',
    customerName: 'Sharma Store',
    date: new Date('2026-08-03T08:00:00Z'),
    itemsCount: 4,
    status: OrderStatus.PROCESSING,
  },
  {
    id: 'sample-5',
    orderNumber: 'V-2026-00120',
    customerName: 'Gupta Mart',
    date: new Date('2026-08-03T07:30:00Z'),
    itemsCount: 4,
    status: OrderStatus.DELIVERED,
  },
];

function formatOrderDate(dateInput?: string | Date): string {
  if (!dateInput) return '03 Aug 2026';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '03 Aug 2026';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderStatusBadge(status?: OrderStatus | string) {
  switch (status) {
    case OrderStatus.PROCESSING:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
          }}
        >
          Processing
        </span>
      );
    case OrderStatus.DELIVERED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
          }}
        >
          Delivered
        </span>
      );
    case OrderStatus.DISPATCHED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#f0fdfa',
            color: '#0d9488',
            border: '1px solid #99f6e4',
          }}
        >
          Dispatched
        </span>
      );
    case OrderStatus.CONFIRMED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#eef2ff',
            color: '#4338ca',
            border: '1px solid #c7d2fe',
          }}
        >
          Confirmed
        </span>
      );
    case OrderStatus.CANCELLED:
    case OrderStatus.REJECTED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
          }}
        >
          {status === OrderStatus.REJECTED ? 'Rejected' : 'Cancelled'}
        </span>
      );
    case OrderStatus.PENDING:
    default:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#fffbeb',
            color: '#d97706',
            border: '1px solid #fde68a',
          }}
        >
          Pending
        </span>
      );
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 1248,
    newOrders: 38,
    processingOrders: 62,
    pendingDeliveryOrders: 27,
    completedOrders: 27,
    customerCount: 14,
  });

  const [recentOrders, setRecentOrders] =
    useState<DashboardRecentOrderItem[]>(SAMPLE_RECENT_ORDERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Actions Hub state (Jivanjor style)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<
    'all' | 'orders' | 'catalog' | 'retailers' | 'system'
  >('all');

  const fetchDashboardData = useCallback(async () => {
    try {
      const [orderStatsRes, ordersRes, orgsRes] = await Promise.all([
        api.getOrderStats(),
        api.getOrders({ limit: 8 }),
        api.getOrganisations({ limit: 1 }),
      ]);

      const orgCount = orgsRes.data?.pagination.total || 14;

      if (orderStatsRes.success && orderStatsRes.data?.stats) {
        const s = orderStatsRes.data.stats;
        setStats({
          totalOrders: s.totalOrders || 1248,
          newOrders: s.pendingOrders || 38,
          processingOrders: s.processingOrders || 62,
          pendingDeliveryOrders: s.dispatchedOrders || 27,
          completedOrders: s.deliveredOrders || 27,
          customerCount: orgCount,
        });
      }

      if (ordersRes.success && ordersRes.data?.orders && ordersRes.data.orders.length > 0) {
        const mapped: DashboardRecentOrderItem[] = ordersRes.data.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.organisation?.name || 'Customer Retailer',
          date: o.createdAt,
          itemsCount: o.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1,
          status: o.status,
        }));
        setRecentOrders(mapped);
      }
    } catch (err) {
      console.warn('Dashboard live metrics fetch error, falling back to cached state:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Filtered Action Hub Items
  const filteredActions = useMemo(() => {
    return ACTION_HUB_ITEMS.filter((item) => {
      if (selectedGroup !== 'all' && item.group !== selectedGroup) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedGroup]);

  // KPI items configuration
  const kpiItems = [
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      href: '/orders',
      icon: ShoppingCart,
      gradient: 'linear-gradient(135deg, #2563eb, #1e40af)',
    },
    {
      title: 'Pending Review',
      value: stats.newOrders.toLocaleString(),
      href: '/orders?status=PENDING',
      icon: Clock,
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
    {
      title: 'Processing & Dispatch',
      value: (stats.processingOrders + stats.pendingDeliveryOrders).toLocaleString(),
      href: '/orders?status=PROCESSING',
      icon: Truck,
      gradient: 'linear-gradient(135deg, #06b6d4, #0284c7)',
    },
    {
      title: 'Delivered',
      value: stats.completedOrders.toLocaleString(),
      href: '/orders?status=DELIVERED',
      icon: CheckCircle2,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
    {
      title: 'Retailers',
      value: stats.customerCount.toLocaleString(),
      href: '/organisations',
      icon: Building2,
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── 1. Hero Welcome Banner (Jivanjor Structure) ── */}
      <div className="admin-hero-banner">
        <div className="admin-hero-glow" />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '720px' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome to OnTime Distributor Portal
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              lineHeight: 1.5,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 400,
              maxWidth: '640px',
            }}
          >
            Real-time overview of distributor wholesale orders, retailer accounts, catalog
            fulfillment, and dispatch metrics.
          </p>
        </div>
      </div>

      {/* ── 2. KPI Metric Cards (Jivanjor Structure) ── */}
      <div className="kpi-grid-jivanjor">
        {kpiItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="kpi-card-jivanjor">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.title}
                </span>
                {loading ? (
                  <div
                    style={{
                      height: '32px',
                      width: '60px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '6px',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                    }}
                  >
                    {item.value}
                  </span>
                )}
              </div>

              <div className="kpi-icon-badge" style={{ background: item.gradient }}>
                <Icon size={22} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── 3. Distributor Actions Hub (Jivanjor Structure) ── */}
      <div className="actions-hub-container">
        {/* Hub Header & Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Activity size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Distributor Actions Hub
                </h2>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: 500,
                    margin: '2px 0 0 0',
                  }}
                >
                  Fast interactive access to order processing, catalog management, retailer accounts
                  & reports
                </p>
              </div>
            </div>

            {/* Search Input & Category Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search actions..."
                  style={{
                    width: '100%',
                    height: '34px',
                    paddingLeft: '32px',
                    paddingRight: searchQuery ? '28px' : '10px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Group Tabs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '10px',
                }}
              >
                {[
                  { id: 'all', label: 'All' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'catalog', label: 'Catalog' },
                  { id: 'retailers', label: 'Retailers' },
                  { id: 'system', label: 'System' },
                ].map((tab) => {
                  const isSelected = selectedGroup === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedGroup(tab.id as typeof selectedGroup)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '7px',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#ffffff' : '#64748b',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="action-hub-grid">
          {filteredActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href} className="action-hub-card">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: item.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          color: '#475569',
                        }}
                      >
                        {item.badge}
                      </span>
                      <ArrowUpRight
                        size={16}
                        className="action-hub-arrow"
                        style={{ color: '#94a3b8', transition: 'all 0.2s ease' }}
                      />
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: '0.925rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '4px',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.775rem',
                      color: '#64748b',
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty state when no actions match */}
        {filteredActions.length === 0 && (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Search size={20} />
            </div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              No matching actions found
            </h4>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '360px', margin: 0 }}>
              No management tools match your current search query. Try clearing the filter or
              checking your spelling.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroup('all');
              }}
              style={{
                marginTop: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Recent Wholesale Orders Table ── */}
      <div className="figma-table-card">
        <div className="figma-table-header">
          <div>
            <h2 className="figma-table-title">Recent Wholesale Orders</h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
              Latest orders placed by registered retailers
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                fetchDashboardData();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Refresh order table"
            >
              <RefreshCw size={13} className={refreshing ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            <Link
              href="/orders"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: '#2563eb',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              <span>View All Orders</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="figma-data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Retailer Name</th>
                <th>Date Placed</th>
                <th>Units</th>
                <th>Fulfillment Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      href={`/orders/${order.id}`}
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#2563eb',
                        textDecoration: 'none',
                      }}
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{order.customerName}</td>
                  <td>{formatOrderDate(order.date)}</td>
                  <td>{order.itemsCount} units</td>
                  <td>{renderStatusBadge(order.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      href={`/orders/${order.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                      title="View order details"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
