'use client';

import React, { ReactNode } from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopNav } from '../../components/layout/TopNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="admin-layout">
        <Sidebar />
        <div className="admin-main">
          <TopNav />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
