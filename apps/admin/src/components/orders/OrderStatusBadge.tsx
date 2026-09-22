'use client';

import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { OrderStatus } from '@ontime/shared';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case OrderStatus.AWAITING:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
          }}
        >
          <Clock size={11} />
          <span>Awaiting Approval</span>
        </span>
      );
    case OrderStatus.CONFIRMED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
          }}
        >
          <CheckCircle2 size={11} />
          <span>Confirmed</span>
        </span>
      );
    case OrderStatus.PROCESSING:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#f5f3ff',
            color: '#6d28d9',
            border: '1px solid #ddd6fe',
          }}
        >
          <Package size={11} />
          <span>Processing</span>
        </span>
      );
    case OrderStatus.DISPATCHED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#ecfeff',
            color: '#0e7490',
            border: '1px solid #a5f3fc',
          }}
        >
          <span>Dispatched</span>
        </span>
      );
    case OrderStatus.DELIVERED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
          }}
        >
          <CheckCircle2 size={11} />
          <span>Delivered</span>
        </span>
      );
    case OrderStatus.CANCELLED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
          }}
        >
          <span>Cancelled</span>
        </span>
      );
    case OrderStatus.REJECTED:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#fff1f2',
            color: '#be123c',
            border: '1px solid #fecdd3',
          }}
        >
          <AlertCircle size={11} />
          <span>Rejected</span>
        </span>
      );
    case OrderStatus.PENDING:
    default:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1',
          }}
        >
          <Clock size={11} />
          <span>Pending Review</span>
        </span>
      );
  }
}
