'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

/**
 * Phase 18: see src/app/products/layout.tsx for the full rationale —
 * /usage had the identical gap.
 */
export default function UsageLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar>{children}</Sidebar>
    </ProtectedRoute>
  );
}
