'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@ontime.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setErrorMessage(result.error || 'Invalid credentials or access denied');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="figma-screen-container" data-node-id="4:4">
      {/* Top Left Figma Wireframe Header */}
      <header className="figma-screen-header">
        <h1 className="figma-screen-title">01. Admin Login</h1>
        <p className="figma-screen-subtitle">Secure distributor access</p>
      </header>

      {/* Main Centered Login Card */}
      <main className="figma-login-wrapper">
        <div className="figma-login-card">
          <h2 className="figma-login-heading">Welcome back</h2>

          {errorMessage && (
            <div className="alert-banner alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Access Denied</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
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
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Log in Action Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              style={{ marginBottom: '1.25rem' }}
            >
              Log in
            </Button>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'center' }}>
              <Link href="/forgot-password" className="link-btn">
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
