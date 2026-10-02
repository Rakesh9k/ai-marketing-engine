'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { ProductForm } from '@/features/products/components/ProductForm';

export default function NewProductPage() {
  const { user, status } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserBusiness() {
      if (!user) return;
      try {
        const businesses = await businessService.getByUserId(user.uid);
        if (businesses.length > 0 && businesses[0]) {
          setBusinessId(businesses[0].businessId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadUserBusiness();
    }
  }, [user]);

  if (status === 'loading' || loading) {
    return <PageSkeleton variant="form" />;
  }

  if (!user || !businessId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-sm font-medium text-neutral-600">
          Please set up a business profile first.
        </p>
      </div>
    );
  }

  return <ProductForm businessId={businessId} />;
}
