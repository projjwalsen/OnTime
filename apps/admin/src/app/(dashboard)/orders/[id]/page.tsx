'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Truck,
  Check,
  XCircle,
  Plus,
  Trash2,
  Building2,
  MapPin,
  FileText,
  User as UserIcon,
  Send,
  AlertCircle,
  History,
  Calendar,
  Shield,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import {
  type Order,
  type OrderHistory,
  type Product,
  OrderStatus,
  UserRole,
  ALLOWED_STATUS_TRANSITIONS,
} from '@ontime/shared';
import { OrderStatusBadge } from '../../../../components/orders/OrderStatusBadge';

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

function formatRelativeTime(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

interface EditLineItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productSku: string;
  variantWeight?: string | null;
  unitPrice: number;
  quantity: number;
  originalQuantity?: number | null;
  totalPrice: number;
}

export default function OrderDetailPage({ params }: { params?: { id: string } }) {
  const routeParams = useParams();
  const orderId = (params?.id || (routeParams?.id as string)) || '';
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Catalog for adding replacement items
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');
  const [selectedAddVariantId, setSelectedAddVariantId] = useState<string>('');
  const [selectedAddQty, setSelectedAddQty] = useState<number>(1);

  // Editable items state for Super Admin stock modification
  const [editableItems, setEditableItems] = useState<EditLineItem[]>([]);
  const [modificationNote, setModificationNote] = useState<string>('');
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [showCancelSection, setShowCancelSection] = useState<boolean>(false);

  async function loadOrder() {
    try {
      setLoading(true);
      setActionError(null);
      const [orderRes, productsRes] = await Promise.all([
        api.getOrderById(orderId),
        api.getProducts({ limit: 100, isActive: true }),
      ]);

      if (orderRes.success && orderRes.data?.order) {
        const ord = orderRes.data.order;
        setOrder(ord);
        setModificationNote(ord.modificationNote || '');

        // Initialize editable items
        const initialItems: EditLineItem[] = (ord.items || []).map((it) => ({
          id: it.id,
          productId: it.productId,
          variantId: it.variantId || null,
          productName: it.productName,
          productSku: it.productSku,
          variantWeight: it.variantWeight || null,
          unitPrice: Number(it.unitPrice),
          quantity: it.quantity,
          originalQuantity: it.originalQuantity ?? it.quantity,
          totalPrice: Number(it.totalPrice),
        }));
        setEditableItems(initialItems);
      } else {
        setActionError(orderRes.error || 'Failed to load order');
      }

      if (productsRes.success && productsRes.data?.products) {
        setCatalogProducts(productsRes.data.products);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load order';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  // Handle item quantity change in editor
  function handleItemQtyChange(index: number, newQty: number) {
    if (newQty < 0) return;
    setEditableItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      item.quantity = newQty;
      item.totalPrice = item.unitPrice * newQty;
      return updated;
    });
  }

  // Remove line item
  function handleRemoveItem(index: number) {
    setEditableItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Add new item to order
  function handleAddCatalogItem() {
    if (!selectedAddProductId) return;
    const prod = catalogProducts.find((p) => p.id === selectedAddProductId);
    if (!prod) return;

    let unitPrice = Number(prod.price);
    let variantWeight: string | null = null;
    let variantId: string | null = null;

    if (selectedAddVariantId) {
      const v = prod.variants?.find((varItem) => varItem.id === selectedAddVariantId);
      if (v) {
        unitPrice = Number(v.price);
        variantWeight = v.weight || null;
        variantId = v.id;
      }
    }

    const newItem: EditLineItem = {
      productId: prod.id,
      variantId,
      productName: prod.name,
      productSku: prod.sku,
      variantWeight,
      unitPrice,
      quantity: selectedAddQty,
      originalQuantity: selectedAddQty,
      totalPrice: unitPrice * selectedAddQty,
    };

    setEditableItems((prev) => [...prev, newItem]);
    setSelectedAddProductId('');
    setSelectedAddVariantId('');
    setSelectedAddQty(1);
  }

  // Calculate live totals
  const subtotal = editableItems.reduce((sum, it) => sum + (it.quantity > 0 ? it.totalPrice : 0), 0);
  const totalAmount = subtotal;

  const hasItemsChanged = () => {
    if (!order?.items) return false;
    if (order.items.length !== editableItems.length) return true;
    for (let i = 0; i < editableItems.length; i++) {
      const original = order.items[i];
      const current = editableItems[i];
      if (!original || !current) return true;
      if (original.quantity !== current.quantity) return true;
      if (original.productId !== current.productId) return true;
      if (original.variantId !== current.variantId) return true;
    }
    return false;
  };

  // Super Admin confirms full order directly
  async function handleConfirmFullOrder() {
    if (!order) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // If items modified, save first
      if (hasItemsChanged()) {
        const modifyRes = await api.modifyOrder(order.id, {
          items: editableItems
            .filter((it) => it.quantity > 0)
            .map((it) => ({
              productId: it.productId,
              variantId: it.variantId,
              quantity: it.quantity,
            })),
          modificationNote: modificationNote.trim() || undefined,
          status: OrderStatus.CONFIRMED,
        });
        if (!modifyRes.success) {
          setActionError(modifyRes.error || 'Failed to confirm modified order');
          setSubmitting(false);
          return;
        }
      } else {
        const res = await api.updateOrderStatus(order.id, {
          status: OrderStatus.CONFIRMED,
        });
        if (!res.success) {
          setActionError(res.error || 'Failed to confirm order');
          setSubmitting(false);
          return;
        }
      }
      setActionSuccess('Order confirmed successfully. Ready for warehouse processing.');
      await loadOrder();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error confirming order';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Super Admin submits modified/partial order for Retailer Approval (transitions to AWAITING)
  async function handleSubmitForRetailerApproval() {
    if (!order) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const activeItems = editableItems.filter((it) => it.quantity > 0);
      if (activeItems.length === 0) {
        setActionError('Please specify at least one product with quantity > 0');
        setSubmitting(false);
        return;
      }

      const res = await api.modifyOrder(order.id, {
        items: activeItems.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
        })),
        modificationNote: modificationNote.trim() || undefined,
        status: OrderStatus.AWAITING,
      });

      if (res.success) {
        setActionSuccess(
          'Order modified as per stock and placed in AWAITING status. Retailer has been notified to review & approve.',
        );
        await loadOrder();
      } else {
        setActionError(res.error || 'Failed to submit partial order');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error modifying order';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Approve Partial Order (Retailer or Super Admin on retailer's behalf)
  async function handleApprovePartial() {
    if (!order) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.approvePartialOrder(order.id);
      if (res.success) {
        setActionSuccess('Partial order approved! Order is now in PROCESSING.');
        await loadOrder();
      } else {
        setActionError(res.error || 'Failed to approve partial order');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving order';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Reject Partial Order (Retailer)
  async function handleRejectPartial() {
    if (!order) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.rejectPartialOrder(order.id, {
        reason: cancellationReason.trim() || 'Declined partial order stock adjustment',
      });
      if (res.success) {
        setActionSuccess('Partial order rejected and marked as REJECTED.');
        setShowCancelSection(false);
        await loadOrder();
      } else {
        setActionError(res.error || 'Failed to reject partial order');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error rejecting order';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Advance Lifecycle Status (Super Admin)
  async function handleAdvanceStatus(nextStatus: OrderStatus) {
    if (!order) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.updateOrderStatus(order.id, {
        status: nextStatus,
      });
      if (res.success) {
        setActionSuccess(`Order status transitioned to "${nextStatus}" successfully.`);
        await loadOrder();
      } else {
        setActionError(res.error || `Failed to transition status to "${nextStatus}"`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating status';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Cancel Order
  async function handleCancelOrder() {
    if (!order) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.cancelOrder(order.id, {
        cancellationReason: cancellationReason.trim() || 'Cancelled by distributor administrator',
      });
      if (res.success) {
        setActionSuccess('Order cancelled successfully.');
        setShowCancelSection(false);
        await loadOrder();
      } else {
        setActionError(res.error || 'Failed to cancel order');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling order';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={24} className="spinner" style={{ margin: '0 auto 12px auto' }} />
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link href="/orders" className="btn-secondary" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} /> Back to Wholesale Orders
        </Link>
        <div className="alert-banner alert-danger">
          {actionError || 'Order not found.'}
        </div>
      </div>
    );
  }

  const isEditable = order.status === OrderStatus.PENDING || order.status === OrderStatus.AWAITING;
  const isAwaitingApproval = order.status === OrderStatus.AWAITING;
  const isTerminated = order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED || order.status === OrderStatus.DELIVERED;
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Breadcrumb & Top Controls ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/orders"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              height: '36px',
              fontSize: '0.85rem',
            }}
          >
            <ArrowLeft size={14} />
            <span>Orders List</span>
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
            {order.orderNumber}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Order History Switch Toggle Button */}
          <button
            type="button"
            role="switch"
            aria-checked={showHistory}
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary"
            style={{
              height: '36px',
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: showHistory ? '#eff6ff' : '#ffffff',
              borderColor: showHistory ? '#2563eb' : '#cbd5e1',
              color: showHistory ? '#1d4ed8' : '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
            title={showHistory ? 'Hide order history timeline' : 'Show order history timeline'}
          >
            <History size={14} style={{ color: showHistory ? '#2563eb' : '#64748b' }} />
            <span>Order History</span>

            {/* Switch Toggle */}
            <div
              style={{
                width: '32px',
                height: '18px',
                backgroundColor: showHistory ? '#2563eb' : '#cbd5e1',
                borderRadius: '9999px',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  position: 'absolute',
                  left: '2px',
                  top: '2px',
                  transform: showHistory ? 'translateX(14px)' : 'translateX(0px)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                }}
              />
            </div>
          </button>

          <button
            onClick={loadOrder}
            className="btn-secondary"
            style={{ height: '36px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Refresh order data"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Banners for Actions & Errors ── */}
      {actionError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Fulfillment Stepper / Pipeline ── */}
      <div
        className="figma-table-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Step 1: PENDING */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: order.status === OrderStatus.PENDING ? '#2563eb' : '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              1
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Pending Review</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Created by retailer</div>
            </div>
          </div>

          <div style={{ flex: 1, height: '2px', backgroundColor: order.status !== OrderStatus.PENDING ? '#10b981' : '#e2e8f0', margin: '0 12px' }} />

          {/* Step 2: Awaiting Approval (if partial) / Confirmed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor:
                  order.status === OrderStatus.AWAITING
                    ? '#f59e0b'
                    : order.status === OrderStatus.CONFIRMED ||
                      order.status === OrderStatus.PROCESSING ||
                      order.status === OrderStatus.DISPATCHED ||
                      order.status === OrderStatus.DELIVERED
                      ? '#10b981'
                      : '#e2e8f0',
                color: order.status === OrderStatus.PENDING ? '#64748b' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              2
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                {order.status === OrderStatus.AWAITING ? 'Awaiting Approval' : 'Confirmed Stock'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Stock verified</div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              height: '2px',
              backgroundColor:
                order.status === OrderStatus.PROCESSING ||
                  order.status === OrderStatus.DISPATCHED ||
                  order.status === OrderStatus.DELIVERED
                  ? '#10b981'
                  : '#e2e8f0',
              margin: '0 12px',
            }}
          />

          {/* Step 3: Processing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor:
                  order.status === OrderStatus.PROCESSING
                    ? '#7c3aed'
                    : order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.DELIVERED
                      ? '#10b981'
                      : '#e2e8f0',
                color:
                  order.status === OrderStatus.PROCESSING ||
                    order.status === OrderStatus.DISPATCHED ||
                    order.status === OrderStatus.DELIVERED
                    ? '#ffffff'
                    : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              3
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>In Processing</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Warehouse packing</div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              height: '2px',
              backgroundColor:
                order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.DELIVERED
                  ? '#10b981'
                  : '#e2e8f0',
              margin: '0 12px',
            }}
          />

          {/* Step 4: Dispatched */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor:
                  order.status === OrderStatus.DISPATCHED
                    ? '#0891b2'
                    : order.status === OrderStatus.DELIVERED
                      ? '#10b981'
                      : '#e2e8f0',
                color:
                  order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.DELIVERED
                    ? '#ffffff'
                    : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              4
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Dispatched</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Out for delivery</div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              height: '2px',
              backgroundColor: order.status === OrderStatus.DELIVERED ? '#10b981' : '#e2e8f0',
              margin: '0 12px',
            }}
          />

          {/* Step 5: Delivered */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: order.status === OrderStatus.DELIVERED ? '#10b981' : '#e2e8f0',
                color: order.status === OrderStatus.DELIVERED ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              5
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Delivered</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Order complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Collapsible Order Activity & History Timeline ── */}
      {showHistory && (
        <div
          className="figma-table-card"
          style={{
            marginBottom: '1.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #bfdbfe',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
          }}
        >
          <div
            className="figma-table-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '1rem 1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <History size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="figma-table-title" style={{ margin: 0, fontSize: '1rem' }}>
                    Order Activity & Timestamp History
                  </h2>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '2px' }}>
                  Complete chronological audit log capturing what happened, who performed it, and exact timestamps.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="btn-secondary"
              style={{
                height: '30px',
                padding: '0 10px',
                fontSize: '0.8rem',
                color: '#64748b',
              }}
            >
              Hide History
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {!order.history || order.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                <History size={36} style={{ color: '#94a3b8', margin: '0 auto 8px auto', display: 'block' }} />
                <p style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>No history records found</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Lifecycle events and modifications will appear here automatically as they occur.
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
                {/* Timeline vertical spine line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    bottom: '12px',
                    left: '11px',
                    width: '2px',
                    backgroundColor: '#e2e8f0',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {order.history.map((item, index) => {
                    const isAwaiting = item.status === OrderStatus.AWAITING;
                    const isProcessing = item.status === OrderStatus.PROCESSING;
                    const isDispatched = item.status === OrderStatus.DISPATCHED;
                    const isDelivered = item.status === OrderStatus.DELIVERED;
                    const isCancelled = item.status === OrderStatus.CANCELLED;
                    const isRejected = item.status === OrderStatus.REJECTED;

                    let dotColor = '#2563eb';
                    let dotBg = '#eff6ff';
                    if (isAwaiting) {
                      dotColor = '#d97706';
                      dotBg = '#fffbeb';
                    } else if (isProcessing) {
                      dotColor = '#7c3aed';
                      dotBg = '#f5f3ff';
                    } else if (isDispatched) {
                      dotColor = '#0891b2';
                      dotBg = '#ecfeff';
                    } else if (isDelivered) {
                      dotColor = '#10b981';
                      dotBg = '#ecfdf5';
                    } else if (isCancelled || isRejected) {
                      dotColor = '#ef4444';
                      dotBg = '#fef2f2';
                    }

                    return (
                      <div key={item.id || index} style={{ position: 'relative' }}>
                        {/* Timeline Node Dot */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-1.75rem',
                            top: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: dotBg,
                            border: `2px solid ${dotColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: dotColor,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            zIndex: 2,
                          }}
                        >
                          {index + 1}
                        </div>

                        {/* Event Content Card */}
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1rem 1.25rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Event Header: Action + Status + Timestamp */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                                {item.action}
                              </span>
                              <OrderStatusBadge status={item.status} />
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                color: '#64748b',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                padding: '3px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              <Calendar size={13} style={{ color: '#94a3b8' }} />
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {formatDate(item.createdAt)}
                              </span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Performer Details */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.825rem',
                              color: '#475569',
                              marginBottom:
                                item.note || (item.metadata && Object.keys(item.metadata).length > 0)
                                  ? '8px'
                                  : '0',
                            }}
                          >
                            {item.performedByUserRole === UserRole.SUPER_ADMIN ? (
                              <Shield size={14} style={{ color: '#7c3aed' }} />
                            ) : (
                              <UserIcon size={14} style={{ color: '#64748b' }} />
                            )}
                            <span>Performed by:</span>
                            <strong style={{ color: '#1e293b' }}>
                              {item.performedByUserName || 'System / Administrator'}
                            </strong>
                            {item.performedByUserRole && (
                              <span
                                style={{
                                  backgroundColor:
                                    item.performedByUserRole === UserRole.SUPER_ADMIN ? '#f5f3ff' : '#f1f5f9',
                                  color:
                                    item.performedByUserRole === UserRole.SUPER_ADMIN ? '#6d28d9' : '#475569',
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${item.performedByUserRole === UserRole.SUPER_ADMIN ? '#ddd6fe' : '#e2e8f0'
                                    }`,
                                }}
                              >
                                {item.performedByUserRole.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {/* Notes / Reason Box */}
                          {item.note && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                backgroundColor: '#ffffff',
                                borderLeft: `3px solid ${dotColor}`,
                                borderRadius: '0 6px 6px 0',
                                fontSize: '0.85rem',
                                color: '#334155',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                  marginBottom: '2px',
                                }}
                              >
                                Note / Reason
                              </div>
                              <div style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                &ldquo;{item.note}&rdquo;
                              </div>
                            </div>
                          )}

                          {/* Metadata Snapshot */}
                          {item.metadata &&
                            (item.metadata.itemsCount !== undefined ||
                              item.metadata.totalAmount !== undefined ||
                              (Array.isArray(item.metadata.items) && item.metadata.items.length > 0)) && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  padding: '8px 12px',
                                  backgroundColor: '#ffffff',
                                  border: '1px dashed #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  color: '#475569',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.metadata.itemsCount !== undefined && (
                                    <span>
                                      Line Items:{' '}
                                      <strong style={{ color: '#0f172a' }}>{item.metadata.itemsCount}</strong>
                                    </span>
                                  )}
                                  {item.metadata.totalAmount !== undefined && (
                                    <span>
                                      Order Total:{' '}
                                      <strong style={{ color: '#0f172a' }}>
                                        {formatCurrency(Number(item.metadata.totalAmount))}
                                      </strong>
                                    </span>
                                  )}
                                </div>

                                {Array.isArray(item.metadata.items) && item.metadata.items.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: '6px',
                                      paddingTop: '6px',
                                      borderTop: '1px solid #f1f5f9',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        marginBottom: '4px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Snapshot of Confirmed Stock Quantities:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      {item.metadata.items.map((snapItem: any, snapIdx: number) => (
                                        <div
                                          key={snapIdx}
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.775rem',
                                            color: '#334155',
                                          }}
                                        >
                                          <span>
                                            • {snapItem.productName || snapItem.productId}{' '}
                                            {snapItem.variantWeight ? `(${snapItem.variantWeight})` : ''}
                                          </span>
                                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                            Qty: {snapItem.quantity}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Status Alerts & Action Callouts ── */}
      {isAwaitingApproval && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '0.95rem' }}>
              <Clock size={18} />
              <span>Awaiting Retailer Approval</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#78350f', marginTop: '4px' }}>
              Super Admin modified this order as per available warehouse stock. The retailer must approve the updated quantities to proceed.
            </p>
            {order.modificationNote && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#92400e', backgroundColor: '#fef3c7', padding: '6px 12px', borderRadius: '6px' }}>
                <strong>Stock Note:</strong> {order.modificationNote}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleApprovePartial}
              disabled={submitting}
              className="btn-action-primary"
              style={{ backgroundColor: '#15803d', borderColor: '#166534', height: '38px' }}
            >
              <Check size={15} />
              <span>Approve Order</span>
            </button>
            <button
              onClick={() => setShowCancelSection(true)}
              disabled={submitting}
              className="btn-secondary"
              style={{ color: '#b91c1c', borderColor: '#fecaca', height: '38px' }}
            >
              <XCircle size={15} />
              <span>Reject</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Grid: Order Editor (Left) & Summary / Actions (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* ── Left Column: Line Items & Stock Editor ── */}
        <div>
          <div className="figma-table-card" style={{ marginBottom: '1.5rem' }}>
            <div className="figma-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="figma-table-title">Ordered Products & Quantities</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  {isEditable
                    ? 'Adjust confirmed quantities as per current warehouse stock availability.'
                    : 'Product line items with snapshotted pricing.'}
                </p>
              </div>

              {isEditable && (
                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>
                  Stock Edit Mode Active
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="figma-data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th style={{ textAlign: 'center' }}>
                      {isEditable ? 'Confirmed Qty' : 'Quantity'}
                    </th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    {isEditable && <th style={{ textAlign: 'center', width: '50px' }}>Remove</th>}
                  </tr>
                </thead>
                <tbody>
                  {editableItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No items in this order. Add items from the catalog below.
                      </td>
                    </tr>
                  ) : (
                    editableItems.map((item, idx) => {
                      const wasModified =
                        item.originalQuantity !== undefined &&
                        item.originalQuantity !== null &&
                        item.originalQuantity !== item.quantity;

                      return (
                        <tr key={item.id || `${item.productId}-${item.variantId}-${idx}`}>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{item.productName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              SKU: {item.productSku}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                              {item.variantWeight || 'Standard'}
                            </span>
                          </td>

                          {/* Editable Quantity Controls */}
                          <td style={{ textAlign: 'center' }}>
                            {isEditable ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyChange(idx, item.quantity - 1)}
                                  disabled={item.quantity <= 0}
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '4px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                  }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.quantity}
                                  onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value) || 0)}
                                  style={{
                                    width: '50px',
                                    height: '28px',
                                    textAlign: 'center',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontWeight: 600,
                                    color: wasModified ? '#d97706' : '#0f172a',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyChange(idx, item.quantity + 1)}
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '4px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                  }}
                                >
                                  +
                                </button>
                                {wasModified && (
                                  <span
                                    title={`Original Requested: ${item.originalQuantity}`}
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#94a3b8',
                                      textDecoration: 'line-through',
                                      marginLeft: '4px',
                                    }}
                                  >
                                    req: {item.originalQuantity}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <strong style={{ fontSize: '0.9rem' }}>{item.quantity}</strong>
                                {wasModified && (
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                    Req: {item.originalQuantity}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td style={{ textAlign: 'right', color: '#334155', fontSize: '0.9rem' }}>
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            {formatCurrency(item.totalPrice)}
                          </td>

                          {isEditable && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                style={{ color: '#dc2626', padding: '4px' }}
                                title="Remove item from order"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Add Product from Catalog Section (When in Stock Edit Mode) ── */}
            {isEditable && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  borderTop: '1px solid var(--border-figma)',
                  backgroundColor: '#f8fafc',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  + Add Additional / Alternative Product to Order
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px auto', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-input"
                    style={{ height: '36px' }}
                    value={selectedAddProductId}
                    onChange={(e) => {
                      setSelectedAddProductId(e.target.value);
                      setSelectedAddVariantId('');
                    }}
                  >
                    <option value="">Select product to add...</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {formatCurrency(Number(p.price))}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-input"
                    style={{ height: '36px' }}
                    disabled={!selectedAddProductId}
                    value={selectedAddVariantId}
                    onChange={(e) => setSelectedAddVariantId(e.target.value)}
                  >
                    <option value="">Standard / Base</option>
                    {catalogProducts
                      .find((p) => p.id === selectedAddProductId)
                      ?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.weight || 'Variant'} — {formatCurrency(Number(v.price))}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={selectedAddQty}
                    onChange={(e) => setSelectedAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    style={{ height: '36px', textAlign: 'center' }}
                    placeholder="Qty"
                  />

                  <button
                    type="button"
                    onClick={handleAddCatalogItem}
                    disabled={!selectedAddProductId}
                    className="btn-secondary"
                    style={{ height: '36px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            )}

            {/* ── Stock Modification Note (Super Admin) ── */}
            {isEditable && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-figma)' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a' }}>
                  Stock Adjustment Note for Retailer (Optional)
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ height: '64px', fontSize: '0.875rem' }}
                  placeholder="E.g., Basmati Rice 5kg limited to 5 bags due to limited warehouse stock. Sunflower oil is currently out of stock."
                  value={modificationNote}
                  onChange={(e) => setModificationNote(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  This note will be included in the email notification sent to the retailer.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Order Summary, Customer Details & Actions ── */}
        <div>
          {/* Order Financial Totals */}
          <div className="figma-table-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Order Amount Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Tax / GST:</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: '#0f172a',
                  borderTop: '1px solid var(--border-figma)',
                  paddingTop: '8px',
                  marginTop: '4px',
                }}
              >
                <span>Grand Total:</span>
                <span style={{ color: '#2563eb' }}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* ── Action Buttons for Super Admin ── */}
            {isEditable && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSubmitForRetailerApproval}
                  disabled={submitting || editableItems.filter((it) => it.quantity > 0).length === 0}
                  className="btn-action-primary"
                  style={{
                    height: '42px',
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: '#d97706',
                    borderColor: '#b45309',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  <Send size={15} />
                  <span>Send Modified Order for Approval</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmFullOrder}
                  disabled={submitting || editableItems.filter((it) => it.quantity > 0).length === 0}
                  className="btn-secondary"
                  style={{
                    height: '42px',
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: '#eff6ff',
                    borderColor: '#bfdbfe',
                    color: '#1d4ed8',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Confirm Full Order Directly</span>
                </button>
              </div>
            )}

            {/* ── Fulfillment Progression Actions (for CONFIRMED / PROCESSING / DISPATCHED) ── */}
            {order.status === OrderStatus.CONFIRMED && (
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(OrderStatus.PROCESSING)}
                  disabled={submitting}
                  className="btn-action-primary"
                  style={{ height: '42px', width: '100%', justifyContent: 'center' }}
                >
                  <Package size={15} />
                  <span>Advance to Processing (Warehouse)</span>
                </button>
              </div>
            )}

            {order.status === OrderStatus.PROCESSING && (
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(OrderStatus.DISPATCHED)}
                  disabled={submitting}
                  className="btn-action-primary"
                  style={{ height: '42px', width: '100%', justifyContent: 'center', backgroundColor: '#0891b2' }}
                >
                  <Truck size={15} />
                  <span>Mark as Dispatched (In Transit)</span>
                </button>
              </div>
            )}

            {order.status === OrderStatus.DISPATCHED && (
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(OrderStatus.DELIVERED)}
                  disabled={submitting}
                  className="btn-action-primary"
                  style={{ height: '42px', width: '100%', justifyContent: 'center', backgroundColor: '#059669' }}
                >
                  <CheckCircle2 size={15} />
                  <span>Mark as Delivered (Complete)</span>
                </button>
              </div>
            )}

            {!isTerminated && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-figma)', paddingTop: '1rem' }}>
                {!showCancelSection ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelSection(true)}
                    className="btn-secondary"
                    style={{ width: '100%', color: '#dc2626', borderColor: '#fecaca', fontSize: '0.8125rem' }}
                  >
                    Cancel / Terminate Order
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: '#991b1b' }}>
                      Reason for Cancellation
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      style={{ fontSize: '0.8125rem', height: '56px' }}
                      placeholder="Specify cancellation reason..."
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={submitting}
                        className="btn-action-primary"
                        style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c', flex: 1 }}
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelSection(false)}
                        className="btn-secondary"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer & Delivery Information Card */}
          <div className="figma-table-card" style={{ padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Customer & Store Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Building2 size={13} /> Retailer Organisation:
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {order.organisation?.name || 'Retailer Store'}
                </strong>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  Email: {order.organisation?.email || '—'}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <UserIcon size={13} /> Placed By:
                </span>
                <span style={{ color: '#0f172a', fontWeight: 500 }}>
                  {order.createdBy?.name || 'Staff User'} ({order.createdBy?.email})
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <MapPin size={13} /> Delivery Address:
                </span>
                <span style={{ color: '#334155' }}>
                  {order.deliveryAddress || 'Standard Warehouse Delivery'}
                </span>
              </div>

              {order.notes && (
                <div>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <FileText size={13} /> Retailer Order Notes:
                  </span>
                  <span style={{ fontStyle: 'italic', color: '#334155' }}>
                    "{order.notes}"
                  </span>
                </div>
              )}

              {order.cancellationReason && (
                <div style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '6px', color: '#991b1b' }}>
                  <strong>Cancellation/Rejection:</strong> {order.cancellationReason}
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-figma)', paddingTop: '8px', color: '#64748b', fontSize: '0.75rem' }}>
                <div>Placed on: {formatDate(order.createdAt)}</div>
                {order.modifiedAt && <div>Last modified: {formatDate(order.modifiedAt)}</div>}
                {order.cancelledAt && <div>Cancelled on: {formatDate(order.cancelledAt)}</div>}
                {order.deliveredAt && <div>Delivered on: {formatDate(order.deliveredAt)}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
