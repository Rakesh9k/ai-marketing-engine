'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

/**
 * Phase 18: see src/app/products/layout.tsx for the full rationale — /brand
 * had the identical gap (no ProtectedRoute, no Sidebar, stuck spinner on
 * unauthenticated direct access). Mirrors campaigns/layout.tsx.
 */
export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar>{children}</Sidebar>
    </ProtectedRoute>
  );
}
