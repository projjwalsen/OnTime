import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="input-wrapper">
          <input
            id={inputId}
            ref={ref}
            className={`form-input ${error ? 'error' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>{error}</span>
        )}
        {!error && helperText && (
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{helperText}</span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
