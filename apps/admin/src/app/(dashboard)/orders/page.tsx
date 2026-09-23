'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Filter, RefreshCw, Eye, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { api } from '../../../lib/api';
import { OrderStatusBadge } from '../../../components/orders/OrderStatusBadge';
import { Pagination } from '../../../components/ui/Pagination';
import {
  type Order,
  type OrderSummaryStats,
  type Organisation,
  OrderStatus,
} from '@ontime/shared';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateInput?: string | Date): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderSummaryStats | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function loadData() {
    try {
      setLoading(true);
      const [ordersRes, statsRes, orgsRes] = await Promise.all([
        api.getOrders({
          page,
          limit,
          search: search.trim() || undefined,
          status: (statusFilter as OrderStatus) || undefined,
          organisationId: orgFilter || undefined,
        }),
        api.getOrderStats(),
        api.getOrganisations({ limit: 100 }),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data.orders);
        setTotalPages(ordersRes.data.pagination.totalPages || 1);
        setTotalCount(ordersRes.data.pagination.total || 0);
      }

      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }

      if (orgsRes.success && orgsRes.data?.organisations) {
        setOrganisations(orgsRes.data.organisations);
      }
    } catch (err) {
      console.error('Failed to load orders data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [page, limit, statusFilter, orgFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadData();
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              Wholesale Orders
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginTop: '4px' }}>
              Review retail store orders, adjust stock quantities, and track fulfillment stages.
            </p>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#475569',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-figma)',
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      {stats && (
        <div className="kpi-grid-5" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="figma-kpi-card">
            <span className="figma-kpi-title">Total Orders</span>
            <span className="figma-kpi-value">{Number(stats.totalOrders).toLocaleString()}</span>
            <span className="figma-kpi-subtitle">
              Revenue: {formatCurrency(stats.totalRevenue || 0)}
            </span>
          </div>

          <div
            className="figma-kpi-card"
            style={{ cursor: 'pointer', borderTop: statusFilter === 'PENDING' ? '3px solid #3b82f6' : undefined }}
            onClick={() => {
              setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING');
              setPage(1);
            }}
          >
            <span className="figma-kpi-title">New (Pending)</span>
            <span className="figma-kpi-value" style={{ color: '#2563eb' }}>
              {Number(stats.pendingOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Needs Stock Review</span>
          </div>

          <div
            className="figma-kpi-card"
            style={{ cursor: 'pointer', borderTop: statusFilter === 'AWAITING' ? '3px solid #f59e0b' : undefined }}
            onClick={() => {
              setStatusFilter(statusFilter === 'AWAITING' ? '' : 'AWAITING');
              setPage(1);
            }}
          >
            <span className="figma-kpi-title">Awaiting Approval</span>
            <span className="figma-kpi-value" style={{ color: '#d97706' }}>
              {Number(stats.awaitingOrders || 0).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Modified / Partial</span>
          </div>

          <div
            className="figma-kpi-card"
            style={{ cursor: 'pointer', borderTop: statusFilter === 'PROCESSING' ? '3px solid #8b5cf6' : undefined }}
            onClick={() => {
              setStatusFilter(statusFilter === 'PROCESSING' ? '' : 'PROCESSING');
              setPage(1);
            }}
          >
            <span className="figma-kpi-title">In Processing</span>
            <span className="figma-kpi-value" style={{ color: '#7c3aed' }}>
              {Number(stats.processingOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Warehouse Packing</span>
          </div>

          <div
            className="figma-kpi-card"
            style={{ cursor: 'pointer', borderTop: statusFilter === 'DISPATCHED' ? '3px solid #06b6d4' : undefined }}
            onClick={() => {
              setStatusFilter(statusFilter === 'DISPATCHED' ? '' : 'DISPATCHED');
              setPage(1);
            }}
          >
            <span className="figma-kpi-title">Dispatched</span>
            <span className="figma-kpi-value" style={{ color: '#0891b2' }}>
              {Number(stats.dispatchedOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">In Transit</span>
          </div>

          <div
            className="figma-kpi-card"
            style={{ cursor: 'pointer', borderTop: statusFilter === 'DELIVERED' ? '3px solid #10b981' : undefined }}
            onClick={() => {
              setStatusFilter(statusFilter === 'DELIVERED' ? '' : 'DELIVERED');
              setPage(1);
            }}
          >
            <span className="figma-kpi-title">Delivered</span>
            <span className="figma-kpi-value" style={{ color: '#059669' }}>
              {Number(stats.deliveredOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Completed</span>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div
        className="figma-table-card"
        style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem' }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div className="input-wrapper">
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', height: '40px' }}
              placeholder="Search by order number, notes, customer, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-input"
            style={{ height: '40px' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING (New)</option>
            <option value="AWAITING">AWAITING (Modified / Partial)</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Organisation Filter */}
          <select
            className="form-input"
            style={{ height: '40px' }}
            value={orgFilter}
            onChange={(e) => {
              setOrgFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Customers</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          {/* Submit Search */}
          <button type="submit" className="btn-action-primary" style={{ height: '40px' }}>
            <Filter size={15} />
            <span>Apply</span>
          </button>
        </form>
      </div>

      {/* ── Orders Table ── */}
      <div className="figma-table-card">
        <div className="figma-table-header">
          <h2 className="figma-table-title">Order Records ({totalCount})</h2>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Click any order to view details and edit stock
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="figma-data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Retailer Store</th>
                <th>Date & Time</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}
                  >
                    {loading ? 'Loading orders...' : 'No orders matched the selected filters.'}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemCount =
                    order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) ||
                    order.items?.length ||
                    0;

                  return (
                    <tr
                      key={order.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#2563eb' }}>
                            {order.orderNumber}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: '#0f172a' }}>
                            {order.organisation?.name || 'Retailer Store'}
                          </strong>
                          {order.deliveryAddress && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {order.deliveryAddress}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.825rem' }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td style={{ color: '#334155' }}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(Number(order.totalAmount))}
                      </td>
                      <td><OrderStatusBadge status={order.status} /></td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/orders/${order.id}`}
                          className="btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            height: '32px',
                            padding: '0 10px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            borderColor: '#bfdbfe',
                          }}
                        >
                          <Eye size={13} />
                          <span>View & Manage</span>
                          <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalCount}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 25, 50]}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
