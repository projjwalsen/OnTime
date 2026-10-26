'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Download,
  Building2,
  Truck,
  Loader2,
  Package,
} from 'lucide-react';
import { api } from '../../../lib/api';
import {
  Order,
  OrderStatus,
  Organisation,
  CustomerOverallPurchaseHistory,
  CustomerProductPurchaseHistory,
} from '@ontime/shared';
import { useToast } from '../../../components/ui/Toast';

export default function ReportsPage() {
  const { error: toastError, success: toastSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '7days'>('all');

  // Customer Purchase History State (Requirement 2.D)
  const [activeTab, setActiveTab] = useState<'overview' | 'customerHistory'>('overview');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [overallHistory, setOverallHistory] = useState<CustomerOverallPurchaseHistory | null>(null);
  const [productHistory, setProductHistory] = useState<CustomerProductPurchaseHistory | null>(null);
  const [loadingCustomerReport, setLoadingCustomerReport] = useState(false);
  const [historySubTab, setHistorySubTab] = useState<'products' | 'orders'>('products');

  const fetchReportsData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, orgsRes] = await Promise.all([
        api.getOrders({ limit: 100 }),
        api.getOrganisations({ limit: 100 }),
      ]);

      if (ordersRes.success && ordersRes.data?.orders) {
        setOrders(ordersRes.data.orders);
      }
      if (orgsRes.success && orgsRes.data?.organisations) {
        setOrganisations(orgsRes.data.organisations);
        const firstOrg = orgsRes.data.organisations[0];
        if (firstOrg && !selectedOrgId) {
          setSelectedOrgId(firstOrg.id);
        }
      }
    } catch {
      toastError('Failed to load reports and analytics data');
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, toastError]);

  const loadCustomerHistory = useCallback(
    async (orgId: string) => {
      if (!orgId) return;
      setLoadingCustomerReport(true);
      try {
        const [overallRes, prodRes] = await Promise.all([
          api.getCustomerOverallPurchaseHistory(orgId),
          api.getCustomerProductPurchaseHistory(orgId),
        ]);
        if (overallRes.success && overallRes.data) {
          setOverallHistory(overallRes.data);
        }
        if (prodRes.success && prodRes.data) {
          setProductHistory(prodRes.data);
        }
      } catch {
        toastError('Failed to load customer purchase history');
      } finally {
        setLoadingCustomerReport(false);
      }
    },
    [toastError],
  );

  useEffect(() => {
    if (activeTab === 'customerHistory' && selectedOrgId) {
      loadCustomerHistory(selectedOrgId);
    }
  }, [activeTab, selectedOrgId, loadCustomerHistory]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (dateFilter === 'all') return orders;
    const now = new Date().getTime();
    const days = dateFilter === '30days' ? 30 : 7;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
  }, [orders, dateFilter]);

  // Compute calculated metrics
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  }, [filteredOrders]);

  const avgOrderValue = useMemo(() => {
    const validOrders = filteredOrders.filter(
      (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED,
    );
    if (validOrders.length === 0) return 0;
    return totalRevenue / validOrders.length;
  }, [filteredOrders, totalRevenue]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.AWAITING]: 0,
      [OrderStatus.CONFIRMED]: 0,
      [OrderStatus.PROCESSING]: 0,
      [OrderStatus.DISPATCHED]: 0,
      [OrderStatus.DELIVERED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.REJECTED]: 0,
    };
    filteredOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [filteredOrders]);

  // Customer spending ranking
  const customerRankings = useMemo(() => {
    const orgMap = new Map<
      string,
      { org: Organisation | null | undefined; count: number; totalSpent: number }
    >();

    filteredOrders.forEach((order) => {
      const existing = orgMap.get(order.organisationId) || {
        org: organisations.find((o) => o.id === order.organisationId) || order.organisation,
        count: 0,
        totalSpent: 0,
      };

      existing.count += 1;
      if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.REJECTED) {
        existing.totalSpent += Number(order.totalAmount || 0);
      }
      orgMap.set(order.organisationId, existing);
    });

    return Array.from(orgMap.entries())
      .map(([orgId, data]) => ({
        orgId,
        name: data.org?.name || `Customer #${orgId.substring(0, 6)}`,
        city: data.org?.city || '—',
        orderCount: data.count,
        totalSpent: data.totalSpent,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredOrders, organisations]);

  const exportCSV = () => {
    if (filteredOrders.length === 0) {
      toastError('No order records to export');
      return;
    }

    const headers = ['Order Number', 'Customer', 'Date', 'Items Count', 'Total Amount', 'Status'];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      `"${o.organisation?.name || o.organisationId}"`,
      new Date(o.createdAt).toLocaleDateString(),
      o.items?.length || 0,
      o.totalAmount,
      o.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ontime_orders_report_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess('Report exported successfully');
  };

  const exportCustomerProductCSV = () => {
    if (!productHistory || productHistory.products.length === 0) {
      toastError('No product purchase records to export');
      return;
    }

    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Total Quantity',
      'Total Spend ($)',
      'Last Ordered Date',
      'Orders Count',
    ];
    const rows = productHistory.products.map((p) => [
      `"${p.productName}"`,
      `"${p.productSku}"`,
      `"${p.categoryName || 'Uncategorized'}"`,
      p.totalQuantity,
      p.totalSpent,
      new Date(p.lastOrderedDate).toLocaleDateString(),
      p.orderCount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${productHistory.organisationName.replace(/\s+/g, '_')}_product_purchases.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess('Customer product purchase report exported successfully');
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return '#10b981';
      case OrderStatus.PROCESSING:
        return '#f59e0b';
      case OrderStatus.CONFIRMED:
        return '#6366f1';
      case OrderStatus.DISPATCHED:
        return '#3b82f6';
      case OrderStatus.PENDING:
        return '#64748b';
      case OrderStatus.CANCELLED:
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            Reports & Analytics
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Comprehensive wholesale order volume, fulfillment speed, and revenue breakdown
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-figma)',
              borderRadius: '7px',
              padding: '3px',
            }}
          >
            <button
              onClick={() => setDateFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                fontSize: '0.8rem',
                fontWeight: dateFilter === 'all' ? 600 : 500,
                backgroundColor: dateFilter === 'all' ? 'var(--bg-figma-active)' : 'transparent',
                color: dateFilter === 'all' ? '#0f172a' : '#64748b',
                border: 'none',
              }}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                fontSize: '0.8rem',
                fontWeight: dateFilter === '30days' ? 600 : 500,
                backgroundColor: dateFilter === '30days' ? 'var(--bg-figma-active)' : 'transparent',
                color: dateFilter === '30days' ? '#0f172a' : '#64748b',
                border: 'none',
              }}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                fontSize: '0.8rem',
                fontWeight: dateFilter === '7days' ? 600 : 500,
                backgroundColor: dateFilter === '7days' ? 'var(--bg-figma-active)' : 'transparent',
                color: dateFilter === '7days' ? '#0f172a' : '#64748b',
                border: 'none',
              }}
            >
              Last 7 Days
            </button>
          </div>

          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '7px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid var(--border-figma)',
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'overview' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <BarChart3 size={16} />
          <span>Platform Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customerHistory')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            borderBottom:
              activeTab === 'customerHistory' ? '2px solid #2563eb' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'customerHistory' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'customerHistory' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <Building2 size={16} />
          <span>Customer Purchase History (Overall & Product-Wise)</span>
        </button>
      </div>

      {activeTab === 'overview' &&
        (loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <Loader2
              className="spinner"
              size={28}
              color="#2563eb"
              style={{ margin: '0 auto 12px' }}
            />
            <p style={{ fontWeight: 500 }}>Aggregating analytics data...</p>
          </div>
        ) : (
          <>
            {/* Top 4 Metric KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.75rem',
              }}
            >
              <div className="figma-kpi-card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="figma-kpi-title">Gross Revenue</span>
                  <DollarSign size={16} color="#059669" />
                </div>
                <div className="figma-kpi-value">
                  $
                  {totalRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="figma-kpi-subtitle">Completed & active orders</div>
              </div>

              <div className="figma-kpi-card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="figma-kpi-title">Total Orders</span>
                  <ShoppingCart size={16} color="#2563eb" />
                </div>
                <div className="figma-kpi-value">{filteredOrders.length}</div>
                <div className="figma-kpi-subtitle">
                  {dateFilter === 'all' ? 'All records' : `Filtered (${dateFilter})`}
                </div>
              </div>

              <div className="figma-kpi-card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="figma-kpi-title">Avg Order Value</span>
                  <TrendingUp size={16} color="#8b5cf6" />
                </div>
                <div className="figma-kpi-value">
                  $
                  {avgOrderValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="figma-kpi-subtitle">Per non-cancelled order</div>
              </div>

              <div className="figma-kpi-card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="figma-kpi-title">Fulfillment Rate</span>
                  <CheckCircle2 size={16} color="#10b981" />
                </div>
                <div className="figma-kpi-value">
                  {filteredOrders.length > 0
                    ? `${Math.round((statusBreakdown[OrderStatus.DELIVERED] / filteredOrders.length) * 100)}%`
                    : '0%'}
                </div>
                <div className="figma-kpi-subtitle">
                  {statusBreakdown[OrderStatus.DELIVERED]} orders delivered
                </div>
              </div>
            </div>

            {/* Middle Row: Status Distribution & Volume */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginBottom: '1.75rem',
              }}
            >
              {/* Order Pipeline Breakdown */}
              <div className="figma-table-card">
                <h2
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <BarChart3 size={18} color="#0f172a" />
                  <span>Order Pipeline Distribution</span>
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(
                    [
                      { key: OrderStatus.PENDING, label: 'Pending Verification' },
                      { key: OrderStatus.CONFIRMED, label: 'Confirmed by Distributor' },
                      { key: OrderStatus.PROCESSING, label: 'Processing in Warehouse' },
                      { key: OrderStatus.DISPATCHED, label: 'Dispatched / Out for Delivery' },
                      { key: OrderStatus.DELIVERED, label: 'Delivered & Settled' },
                      { key: OrderStatus.CANCELLED, label: 'Cancelled' },
                    ] as const
                  ).map((item) => {
                    const count = statusBreakdown[item.key] || 0;
                    const pct =
                      filteredOrders.length > 0 ? (count / filteredOrders.length) * 100 : 0;
                    const color = getStatusColor(item.key);

                    return (
                      <div key={item.key}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.825rem',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#334155' }}>{item.label}</span>
                          <span style={{ color: '#64748b' }}>
                            {count} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: '8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              backgroundColor: color,
                              borderRadius: '4px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Insights Card */}
              <div
                className="figma-table-card"
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <h2
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Clock size={18} color="#0f172a" />
                  <span>Operational Summary</span>
                </h2>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                    flex: 1,
                    justifyContent: 'space-around',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fafbfd',
                      border: '1px solid var(--border-figma)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Active Wholesale Customers
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                        {organisations.length} Retailers
                      </div>
                    </div>
                    <Building2 size={24} color="#64748b" />
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fafbfd',
                      border: '1px solid var(--border-figma)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Orders Requiring Action
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                        {statusBreakdown[OrderStatus.PENDING] +
                          statusBreakdown[OrderStatus.PROCESSING]}{' '}
                        Orders
                      </div>
                    </div>
                    <Clock size={24} color="#f59e0b" />
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fafbfd',
                      border: '1px solid var(--border-figma)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        En Route Deliveries
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>
                        {statusBreakdown[OrderStatus.DISPATCHED]} Shipments
                      </div>
                    </div>
                    <Truck size={24} color="#3b82f6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Table: Top Customer Purchasing Ranking */}
            <div className="figma-table-card">
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '1rem',
                }}
              >
                Retailer Customer Volume Ranking
              </h2>

              {customerRankings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No customer order data available for this range.
                </div>
              ) : (
                <table className="figma-data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Customer Name</th>
                      <th>City</th>
                      <th>Total Orders</th>
                      <th>Total Spend ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRankings.map((c, index) => (
                      <tr key={c.orgId}>
                        <td style={{ fontWeight: 600, color: '#64748b' }}>#{index + 1}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</td>
                        <td style={{ color: '#475569' }}>{c.city}</td>
                        <td>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}
                          >
                            {c.orderCount}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          $
                          {c.totalSpent.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ))}

      {/* Customer Purchase History View (Requirement 2.D) */}
      {activeTab === 'customerHistory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Customer Selection Toolbar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: 1,
                minWidth: '280px',
              }}
            >
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  whiteSpace: 'nowrap',
                }}
              >
                Select Customer:
              </label>
              <select
                className="form-input"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                style={{ height: '40px', maxWidth: '360px' }}
              >
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} {org.city ? `(${org.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={exportCustomerProductCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '7px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                <Download size={15} />
                <span>Export Product History CSV</span>
              </button>
            </div>
          </div>

          {loadingCustomerReport ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <Loader2
                className="spinner"
                size={28}
                color="#2563eb"
                style={{ margin: '0 auto 12px' }}
              />
              <p style={{ fontWeight: 500 }}>Loading customer purchase analytics...</p>
            </div>
          ) : overallHistory ? (
            <>
              {/* Customer Overall Purchase Summary Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                <div className="figma-kpi-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className="figma-kpi-title">Total Lifetime Spend</span>
                    <DollarSign size={16} color="#059669" />
                  </div>
                  <div className="figma-kpi-value" style={{ color: '#059669' }}>
                    $
                    {overallHistory.totalSpend.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="figma-kpi-subtitle">Across confirmed wholesale orders</div>
                </div>

                <div className="figma-kpi-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className="figma-kpi-title">Total Orders Count</span>
                    <ShoppingCart size={16} color="#2563eb" />
                  </div>
                  <div className="figma-kpi-value">{overallHistory.totalOrders}</div>
                  <div className="figma-kpi-subtitle">
                    {overallHistory.lastOrderDate
                      ? `Last: ${new Date(overallHistory.lastOrderDate).toLocaleDateString()}`
                      : 'No orders yet'}
                  </div>
                </div>

                <div className="figma-kpi-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className="figma-kpi-title">Average Order Value</span>
                    <TrendingUp size={16} color="#7c3aed" />
                  </div>
                  <div className="figma-kpi-value">
                    $
                    {overallHistory.averageOrderValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="figma-kpi-subtitle">Average spend per purchase</div>
                </div>

                <div className="figma-kpi-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className="figma-kpi-title">Unique Products</span>
                    <Package size={16} color="#d97706" />
                  </div>
                  <div className="figma-kpi-value">{productHistory?.totalProductsCount || 0}</div>
                  <div className="figma-kpi-subtitle">Catalog items ordered</div>
                </div>
              </div>

              {/* Sub-Tabs: Product-wise vs Orders Timeline */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  padding: '6px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  width: 'fit-content',
                }}
              >
                <button
                  type="button"
                  onClick={() => setHistorySubTab('products')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: historySubTab === 'products' ? 700 : 500,
                    backgroundColor: historySubTab === 'products' ? '#2563eb' : 'transparent',
                    color: historySubTab === 'products' ? '#ffffff' : '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Product-Wise Breakdown ({productHistory?.products.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySubTab('orders')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: historySubTab === 'orders' ? 700 : 500,
                    backgroundColor: historySubTab === 'orders' ? '#2563eb' : 'transparent',
                    color: historySubTab === 'orders' ? '#ffffff' : '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Order Timeline ({overallHistory.orders.length})
                </button>
              </div>

              {/* Sub-Tab 1: Product-Wise Breakdown */}
              {historySubTab === 'products' && (
                <div className="figma-table-card">
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '1rem',
                    }}
                  >
                    Products Purchased by {overallHistory.organisationName}
                  </h3>
                  {!productHistory || productHistory.products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                      <p>No products purchased by this customer yet.</p>
                    </div>
                  ) : (
                    <table className="figma-data-table">
                      <thead>
                        <tr>
                          <th>Product Name & SKU</th>
                          <th>Category</th>
                          <th>Total Units Purchased</th>
                          <th>Total Amount Spent ($)</th>
                          <th>Last Ordered Date</th>
                          <th>Order Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productHistory.products.map((p) => (
                          <tr key={p.productId}>
                            <td>
                              <div>
                                <strong style={{ color: '#0f172a' }}>{p.productName}</strong>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  SKU: {p.productSku}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                {p.categoryName || 'Uncategorized'}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#eff6ff',
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {p.totalQuantity} units
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#0f172a' }}>
                                $
                                {p.totalSpent.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {new Date(p.lastOrderedDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                {p.orderCount} order{p.orderCount !== 1 ? 's' : ''}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Orders Timeline */}
              {historySubTab === 'orders' && (
                <div className="figma-table-card">
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '1rem',
                    }}
                  >
                    Historical Orders for {overallHistory.organisationName}
                  </h3>
                  {overallHistory.orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <ShoppingCart size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                      <p>No historical orders recorded for this customer.</p>
                    </div>
                  ) : (
                    <table className="figma-data-table">
                      <thead>
                        <tr>
                          <th>Order Number</th>
                          <th>Order Date</th>
                          <th>Items Count</th>
                          <th>Total Amount ($)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overallHistory.orders.map((o) => (
                          <tr key={o.orderId}>
                            <td>
                              <strong style={{ color: '#2563eb' }}>#{o.orderNumber}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {new Date(o.date).toLocaleDateString()}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                {o.itemCount} items
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#0f172a' }}>
                                $
                                {o.totalAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: '#f1f5f9',
                                  color: getStatusColor(o.status as OrderStatus),
                                }}
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              Please select a customer organisation to view their purchase history.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
