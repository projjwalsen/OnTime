'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Eye, XCircle, ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api';
import {
  type Order,
  type OrderSummaryStats,
  type Organisation,
  OrderStatus,
  ALLOWED_STATUS_TRANSITIONS,
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

function renderStatusBadge(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PROCESSING:
      return <span className="badge badge-figma-processing">Processing</span>;
    case OrderStatus.DELIVERED:
      return <span className="badge badge-figma-delivered">Delivered</span>;
    case OrderStatus.CONFIRMED:
      return <span className="badge badge-figma-processing">Confirmed</span>;
    case OrderStatus.DISPATCHED:
      return <span className="badge badge-figma-dispatched">Dispatched</span>;
    case OrderStatus.CANCELLED:
      return <span className="badge badge-figma-cancelled">Cancelled</span>;
    case OrderStatus.PENDING:
    default:
      return <span className="badge badge-figma-pending">Pending</span>;
  }
}

export default function OrdersPage() {
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [ordersRes, statsRes, orgsRes] = await Promise.all([
        api.getOrders({
          page,
          limit: 15,
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
  }, [page, statusFilter, orgFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadData();
  }

  async function handleUpdateStatus() {
    if (!selectedOrder || !nextStatus) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.updateOrderStatus(selectedOrder.id, {
        status: nextStatus,
      });
      if (res.success) {
        setStatusModalOpen(false);
        loadData();
      } else {
        setActionError(res.error || 'Failed to update order status');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelOrder() {
    if (!selectedOrder) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.cancelOrder(selectedOrder.id, {
        cancellationReason: cancellationReason.trim() || 'Cancelled by Distributor Admin',
      });
      if (res.success) {
        setCancelModalOpen(false);
        setCancellationReason('');
        loadData();
      } else {
        setActionError(res.error || 'Failed to cancel order');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
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
              Track retail orders, fulfill shipment stages, and manage cancellations.
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
        <div className="kpi-grid-5">
          <div className="figma-kpi-card">
            <span className="figma-kpi-title">Total Orders</span>
            <span className="figma-kpi-value">{Number(stats.totalOrders).toLocaleString()}</span>
            <span className="figma-kpi-subtitle">
              Revenue: {formatCurrency(stats.totalRevenue || 0)}
            </span>
          </div>

          <div className="figma-kpi-card">
            <span className="figma-kpi-title">New (Pending)</span>
            <span className="figma-kpi-value">{Number(stats.pendingOrders).toLocaleString()}</span>
            <span className="figma-kpi-subtitle">Awaiting Confirmation</span>
          </div>

          <div className="figma-kpi-card">
            <span className="figma-kpi-title">Processing</span>
            <span className="figma-kpi-value">
              {Number(stats.processingOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Warehouse Packing</span>
          </div>

          <div className="figma-kpi-card">
            <span className="figma-kpi-title">Dispatched</span>
            <span className="figma-kpi-value">
              {Number(stats.dispatchedOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Out for Delivery</span>
          </div>

          <div className="figma-kpi-card">
            <span className="figma-kpi-title">Delivered</span>
            <span className="figma-kpi-value">
              {Number(stats.deliveredOrders).toLocaleString()}
            </span>
            <span className="figma-kpi-subtitle">Fulfillment Complete</span>
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
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="DELIVERED">DELIVERED</option>
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

                  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[order.status] || [];

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          {order.orderNumber}
                        </span>
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
                      <td>{renderStatusBadge(order.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}
                        >
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailModalOpen(true);
                            }}
                            className="btn-secondary"
                            style={{ height: '32px', padding: '0 8px' }}
                            title="Inspect Order Details"
                          >
                            <Eye size={14} />
                          </button>

                          {allowedNextStatuses.length > 0 &&
                            order.status !== OrderStatus.DELIVERED &&
                            order.status !== OrderStatus.CANCELLED && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  const firstValid = allowedNextStatuses.find(
                                    (s) => s !== OrderStatus.CANCELLED,
                                  );
                                  setNextStatus(firstValid || '');
                                  setActionError(null);
                                  setStatusModalOpen(true);
                                }}
                                className="btn-secondary"
                                style={{
                                  height: '32px',
                                  padding: '0 10px',
                                  backgroundColor: '#eff6ff',
                                  borderColor: '#bfdbfe',
                                  color: '#2563eb',
                                  fontWeight: 600,
                                }}
                                title="Update Status"
                              >
                                <ChevronRight size={14} />
                                <span>Status</span>
                              </button>
                            )}

                          {order.status !== OrderStatus.DELIVERED &&
                            order.status !== OrderStatus.CANCELLED && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setActionError(null);
                                  setCancelModalOpen(true);
                                }}
                                className="btn-secondary"
                                style={{
                                  height: '32px',
                                  padding: '0 8px',
                                  color: '#dc2626',
                                  borderColor: '#fecaca',
                                }}
                                title="Cancel Order"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-figma)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Page {page} of {totalPages}
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary"
                style={{ height: '34px', padding: '0 12px' }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary"
                style={{ height: '34px', padding: '0 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {detailModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '650px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Order Details: {selectedOrder.orderNumber}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Placed on {formatDate(selectedOrder.createdAt)}
                </span>
              </div>
              <div>{renderStatusBadge(selectedOrder.status)}</div>
            </div>

            <div className="modal-body">
              {/* Customer & Delivery Information */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-figma)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Customer Store:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedOrder.organisation?.name || 'Retailer Organisation'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Contact Email:</span>
                    <span>{selectedOrder.organisation?.email || '—'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', display: 'block' }}>Delivery Address:</span>
                    <span>{selectedOrder.deliveryAddress || 'Standard Warehouse Delivery'}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block' }}>Delivery Notes:</span>
                      <span style={{ fontStyle: 'italic', color: '#334155' }}>
                        "{selectedOrder.notes}"
                      </span>
                    </div>
                  )}
                  {selectedOrder.cancellationReason && (
                    <div
                      style={{
                        gridColumn: 'span 2',
                        backgroundColor: '#fef2f2',
                        padding: '8px',
                        borderRadius: '6px',
                        color: '#991b1b',
                      }}
                    >
                      <strong>Cancellation Reason:</strong> {selectedOrder.cancellationReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <h4
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: '0.5rem',
                }}
              >
                Line Items
              </h4>
              <table className="figma-data-table" style={{ marginBottom: '1rem' }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Weight / Variant</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>
                        <strong>{item.productName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          SKU: {item.productSku}
                        </div>
                      </td>
                      <td>{item.variantWeight || 'Standard'}</td>
                      <td>{formatCurrency(Number(item.unitPrice))}</td>
                      <td>{item.quantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(Number(item.totalPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  borderTop: '1px solid var(--border-figma)',
                  paddingTop: '0.75rem',
                }}
              >
                <div style={{ width: '220px', textAlign: 'right', fontSize: '0.9rem' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}
                  >
                    <span>Subtotal:</span>
                    <span>
                      {formatCurrency(Number(selectedOrder.subtotal || selectedOrder.totalAmount))}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: '1.1rem',
                      marginTop: '6px',
                    }}
                  >
                    <span>Total Amount:</span>
                    <span>{formatCurrency(Number(selectedOrder.totalAmount))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setDetailModalOpen(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Transition Modal ── */}
      {statusModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setStatusModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Update Fulfillment Status</h3>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem' }}>
                Advance order <strong>{selectedOrder.orderNumber}</strong> from current status{' '}
                <span style={{ fontWeight: 600 }}>{selectedOrder.status}</span>.
              </p>

              {actionError && (
                <div className="alert-banner alert-danger" style={{ marginBottom: '1rem' }}>
                  {actionError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Select Next Status</label>
                <select
                  className="form-input"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                >
                  <option value="">Select status transition...</option>
                  {(ALLOWED_STATUS_TRANSITIONS[selectedOrder.status] || []).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                className="btn-action-primary"
                disabled={!nextStatus || submitting}
              >
                {submitting ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Order Modal ── */}
      {cancelModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setCancelModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>
                Cancel Order: {selectedOrder.orderNumber}
              </h3>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem' }}>
                Are you sure you want to cancel this wholesale order? This action is permanent.
              </p>

              {actionError && (
                <div className="alert-banner alert-danger" style={{ marginBottom: '1rem' }}>
                  {actionError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Cancellation Reason</label>
                <textarea
                  className="form-input"
                  style={{ height: '80px', paddingTop: '8px' }}
                  placeholder="Specify why this order is being cancelled..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="btn-secondary"
                disabled={submitting}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
