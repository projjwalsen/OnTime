'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token') || '';

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('Reset token is required');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.resetPassword({ token, newPassword });
      if (res.success) {
        setSuccessMessage('Password reset successfully! You can now log in.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setErrorMessage(res.error || 'Failed to reset password. Invalid or expired token.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="figma-login-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
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
        Set new password
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.75rem' }}>
        Choose a secure password for your distributor administrator account.
      </p>

      {successMessage && (
        <div className="alert-banner alert-success">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Success</strong>
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
          {!queryToken && (
            <div className="form-group">
              <label htmlFor="token" className="form-label">
                Reset Token
              </label>
              <div className="input-wrapper">
                <input
                  id="token"
                  type="text"
                  className="form-input"
                  placeholder="Paste your reset token here"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <div className="input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" variant="primary" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="figma-screen-container">
      <header className="figma-screen-header">
        <h1 className="figma-screen-title">Reset Password</h1>
        <p className="figma-screen-subtitle">Distributor administrator credential reset</p>
      </header>

      <main className="figma-login-wrapper">
        <Suspense
          fallback={
            <div
              className="figma-login-card"
              style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}
            >
              <Loader2 className="spinner" size={32} color="#2563eb" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
