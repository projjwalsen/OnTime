'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopNav } from '../../components/layout/TopNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ontime_admin_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch {
      // ignore local storage errors
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ontime_admin_sidebar_collapsed', String(next));
      } catch {
        // ignore local storage errors
      }
      return next;
    });
  };

  return (
    <AuthGuard>
      <div className="admin-layout">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
        <div className="admin-main">
          <TopNav
            isCollapsed={isCollapsed}
            onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
          />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
