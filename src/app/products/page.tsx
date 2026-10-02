'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { ProductCatalogDashboard } from '@/features/products/components/ProductCatalogDashboard';

export default function ProductsPage() {
  const { user, status } = useAuth();
  const loading = status === 'loading';

  if (loading) {
    return <PageSkeleton variant="cards" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-sm font-medium text-neutral-600">
          Please sign in to access Product Catalog.
        </p>
      </div>
    );
  }

  return <ProductCatalogDashboard userId={user.uid} />;
}
