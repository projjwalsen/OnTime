import React, { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'OnTime — Distributor Admin Portal',
  description: 'Distributor Order & Catalog Management Dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
