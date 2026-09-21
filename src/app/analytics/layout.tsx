'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

/**
 * Phase 32: same auth-gate + Sidebar wrapper every other protected route
 * already has (see billing/layout.tsx, products/layout.tsx) — analytics is
 * account/business data, so it gets the same treatment.
 */
export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar>{children}</Sidebar>
    </ProtectedRoute>
  );
}
