'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

/**
 * Phase 18: see src/app/products/layout.tsx for the full rationale —
 * /billing had the identical gap. Financially-sensitive page, so this is
 * treated conservatively: this only adds the same auth gate every other
 * protected route already has, nothing about payment/credit logic itself
 * is touched.
 */
export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar>{children}</Sidebar>
    </ProtectedRoute>
  );
}
