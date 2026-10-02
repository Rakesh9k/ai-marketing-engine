'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { CategoryManager } from '@/features/products/components/CategoryManager';

export default function ProductCategoriesPage() {
  const { user, status } = useAuth();
  const loading = status === 'loading';

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-sm font-medium text-neutral-600">Please sign in to manage categories.</p>
      </div>
    );
  }

  return <CategoryManager />;
}
