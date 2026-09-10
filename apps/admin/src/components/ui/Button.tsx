import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'action-primary';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'secondary':
        return 'btn-secondary';
      case 'danger':
        return 'btn-danger';
      case 'action-primary':
        return 'btn-action-primary';
      case 'primary':
      default:
        return 'btn-primary';
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${getVariantClass()} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="spinner" size={18} />}
      {children}
    </button>
  );
}
