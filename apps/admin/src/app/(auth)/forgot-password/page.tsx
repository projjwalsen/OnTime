'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPassword({ email });
      if (res.success) {
        setSuccessMessage(
          res.message ||
            'If an account exists with this email, password reset instructions have been sent.',
        );
      } else {
        setErrorMessage(res.error || 'Failed to send reset link');
      }
    } catch {
      setErrorMessage('An unexpected network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="figma-screen-container">
      <header className="figma-screen-header">
        <h1 className="figma-screen-title">Forgot Password</h1>
        <p className="figma-screen-subtitle">Recover distributor admin credentials</p>
      </header>

      <main className="figma-login-wrapper">
        <div className="figma-login-card">
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}
          >
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem',
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to login</span>
            </Link>
          </div>

          <h2 className="figma-login-heading" style={{ marginBottom: '0.5rem' }}>
            Reset password
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748b',
              marginBottom: '1.75rem',
              lineHeight: 1.5,
            }}
          >
            Enter your distributor administrator email and we'll send you instructions to reset your
            password.
          </p>

          {successMessage && (
            <div className="alert-banner alert-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Check your inbox</strong>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="alert-banner alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Error</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="admin@distributor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
