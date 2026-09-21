'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

/**
 * Phase 18: /products and /products/new previously had no layout at all —
 * unlike /dashboard and /campaigns, they never wrapped themselves in
 * ProtectedRoute or rendered the Sidebar. An unauthenticated visitor
 * navigating directly to /products got stuck on a permanent loading
 * spinner (loading starts true and is never set false when there's no
 * user) instead of being redirected to /login, and a logged-in user
 * clicking "Products" in the Sidebar lost the Sidebar entirely on
 * arrival. This mirrors campaigns/layout.tsx exactly — the existing,
 * established pattern — rather than introducing a new one.
 */
export default function ProductsLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar>{children}</Sidebar>
    </ProtectedRoute>
  );
}
