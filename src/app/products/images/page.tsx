'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, productService } from '@/services/database';
import type { Product } from '@/types';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { ProductImageGallery } from '@/features/products/components/ProductImageGallery';

export default function ProductImagesPage() {
  const { user, status } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (!user) return;
      try {
        const userBusinesses = await businessService.getByUserId(user.uid);
        if (userBusinesses.length > 0 && userBusinesses[0]) {
          const prods = await productService.listByBusiness(userBusinesses[0].businessId);
          setProducts(prods);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      void loadProducts();
    }
  }, [user]);

  if (status === 'loading' || loading) {
    return <PageSkeleton variant="cards" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-sm font-medium text-neutral-600">
          Please sign in to access media gallery.
        </p>
      </div>
    );
  }

  return <ProductImageGallery products={products} />;
}
