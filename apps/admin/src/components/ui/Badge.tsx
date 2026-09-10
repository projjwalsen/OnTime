import React, { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'primary';
  showDot?: boolean;
}

export function Badge({ children, variant = 'primary', showDot = true }: BadgeProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'success':
        return 'badge-success';
      case 'warning':
        return 'badge-warning';
      case 'danger':
        return 'badge-danger';
      case 'primary':
      default:
        return 'badge-primary';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'danger':
        return '#ef4444';
      case 'primary':
      default:
        return '#2563eb';
    }
  };

  return (
    <span className={`badge ${getVariantClass()}`}>
      {showDot && <span className="badge-dot" style={{ backgroundColor: getDotColor() }} />}
      {children}
    </span>
  );
}
