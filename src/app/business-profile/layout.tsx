'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

/**
 * Phase 33: same auth-gate + Sidebar wrapper every other protected route
 * uses (see analytics/layout.tsx, products/layout.tsx).
 */
export default function BusinessProfileLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar>{children}</Sidebar>
    </ProtectedRoute>
  );
}
