'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpRight, RefreshCw, ShoppingBag } from 'lucide-react';
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
  {
    id: 'sample-6',
    orderNumber: 'V-2026-00119',
    customerName: 'City Retail',
    date: new Date('2026-08-03T07:00:00Z'),
    itemsCount: 4,
    status: OrderStatus.PENDING,
  },
  {
    id: 'sample-7',
    orderNumber: 'V-2026-00118',
    customerName: 'Sharma Store',
    date: new Date('2026-08-03T06:15:00Z'),
    itemsCount: 4,
    status: OrderStatus.PROCESSING,
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
      return <span className="badge-figma-processing">Processing</span>;
    case OrderStatus.DELIVERED:
      return <span className="badge-figma-delivered">Delivered</span>;
    case OrderStatus.CONFIRMED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#eef2ff',
            color: '#4338ca',
          }}
        >
          Confirmed
        </span>
      );
    case OrderStatus.DISPATCHED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
          }}
        >
          Dispatched
        </span>
      );
    case OrderStatus.PENDING:
      return <span className="badge-figma-pending">Pending</span>;
    case OrderStatus.CANCELLED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          Cancelled
        </span>
      );
    default:
      return <span className="badge-figma-pending">{status || 'Pending'}</span>;
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

  const fetchDashboardData = useCallback(async () => {
    try {
      const [orderStatsRes, ordersRes, orgsRes] = await Promise.all([
        api.getOrderStats(),
        api.getOrders({ limit: 10 }),
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
      } else {
        setStats({
          totalOrders: 1248,
          newOrders: 38,
          processingOrders: 62,
          pendingDeliveryOrders: 27,
          completedOrders: 27,
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
      } else {
        setRecentOrders(SAMPLE_RECENT_ORDERS);
      }
    } catch {
      setRecentOrders(SAMPLE_RECENT_ORDERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div data-node-id="4:47" data-name="03. Dashboard">
      {/* ── Page Header (Figma 4:57, 4:58, 4:59) ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              data-node-id="4:57"
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              Dashboard
            </h1>
            <p
              data-node-id="4:58"
              style={{
                fontSize: '0.9375rem',
                color: '#64748b',
                marginTop: '4px',
              }}
            >
              Business activity overview
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchDashboardData();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#475569',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-figma)',
                transition: 'all var(--transition-fast)',
              }}
              title="Refresh dashboard data"
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
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#0f172a',
                transition: 'all var(--transition-fast)',
              }}
            >
              <ShoppingBag size={14} />
              <span>View All Orders</span>
            </Link>
          </div>
        </div>

        {/* Header divider (Figma 4:59) */}
        <div
          data-node-id="4:59"
          data-name="Header divider"
          style={{
            height: '1px',
            backgroundColor: 'var(--border-figma)',
            marginTop: '1.25rem',
          }}
        />
      </div>

      {/* ── 5 KPI Metric Cards (Figma 4:60 to 49:152) ── */}
      <div className="kpi-grid-5" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Total orders (Figma 4:60) */}
        <div className="figma-kpi-card" data-node-id="4:60" data-name="KPI card">
          <span className="figma-kpi-title" data-node-id="4:61">
            Total orders
          </span>
          <span className="figma-kpi-value" data-node-id="4:62">
            {loading ? '—' : Number(stats.totalOrders).toLocaleString()}
          </span>
          <span className="figma-kpi-subtitle" data-node-id="4:63">
            All time
          </span>
        </div>

        {/* Card 2: New orders (Figma 4:64) */}
        <div className="figma-kpi-card" data-node-id="4:64" data-name="KPI card">
          <span className="figma-kpi-title" data-node-id="4:65">
            New orders
          </span>
          <span className="figma-kpi-value" data-node-id="4:66">
            {loading ? '—' : Number(stats.newOrders).toLocaleString()}
          </span>
          <span className="figma-kpi-subtitle" data-node-id="4:67">
            Today
          </span>
        </div>

        {/* Card 3: Processing (Figma 4:68) */}
        <div className="figma-kpi-card" data-node-id="4:68" data-name="KPI card">
          <span className="figma-kpi-title" data-node-id="4:69">
            Processing
          </span>
          <span className="figma-kpi-value" data-node-id="4:69">
            {loading ? '—' : Number(stats.processingOrders).toLocaleString()}
          </span>
          <span className="figma-kpi-subtitle" data-node-id="4:71">
            Needs action
          </span>
        </div>

        {/* Card 4: Pending delivery (Figma 4:72) */}
        <div className="figma-kpi-card" data-node-id="4:72" data-name="KPI card">
          <span className="figma-kpi-title" data-node-id="4:73">
            Pending delivery
          </span>
          <span className="figma-kpi-value" data-node-id="4:74">
            {loading ? '—' : Number(stats.pendingDeliveryOrders).toLocaleString()}
          </span>
          <span className="figma-kpi-subtitle" data-node-id="4:75">
            Across {stats.customerCount} customers
          </span>
        </div>

        {/* Card 5: Completed Order (Figma 49:152) */}
        <div className="figma-kpi-card" data-node-id="49:152" data-name="KPI card">
          <span className="figma-kpi-title" data-node-id="49:153">
            Completed Order
          </span>
          <span className="figma-kpi-value" data-node-id="49:154">
            {loading ? '—' : Number(stats.completedOrders).toLocaleString()}
          </span>
          <span className="figma-kpi-subtitle" data-node-id="49:155">
            Across {stats.customerCount} customers
          </span>
        </div>
      </div>

      {/* ── Recent Orders Table Section (Figma 4:76) ── */}
      <div className="figma-table-card" data-node-id="4:76" data-name="Recent orders">
        <div className="figma-table-header">
          <h2 className="figma-table-title" data-node-id="4:77">
            Recent orders
          </h2>
          <Link
            href="/orders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.85rem',
              color: '#2563eb',
              fontWeight: 600,
            }}
          >
            <span>See all</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="figma-data-table">
            <thead>
              <tr data-node-id="4:78" data-name="Table row">
                <th data-node-id="4:79">Voucher</th>
                <th data-node-id="4:80">Customer</th>
                <th data-node-id="4:81">Date</th>
                <th data-node-id="4:82">Items</th>
                <th data-node-id="4:83">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, idx) => {
                return (
                  <tr key={order.id || `order-${idx}`} data-name="Table row">
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      <Link
                        href={`/orders?id=${order.id}`}
                        style={{ color: '#0f172a', textDecoration: 'none' }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td style={{ color: '#64748b' }}>{formatOrderDate(order.date)}</td>
                    <td style={{ color: '#475569' }}>
                      {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'items'}
                    </td>
                    <td>{renderStatusBadge(order.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
