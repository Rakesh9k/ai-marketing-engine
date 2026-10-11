'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { productService } from '@/services/database';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { ProductForm } from '@/features/products/components/ProductForm';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();
  const { status } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const prod = await productService.get(productId);
        if (prod) {
          setProduct(prod);
        } else {
          setError('Product not found.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product.');
      } finally {
        setLoading(false);
      }
    }
    if (productId) {
      void loadProduct();
    }
  }, [productId]);

  if (status === 'loading' || loading) {
    return <PageSkeleton variant="form" />;
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h3 className="text-lg font-bold text-red-800">Product Not Found</h3>
        <p className="mt-2 text-sm text-red-600">
          {error || 'The requested product could not be found.'}
        </p>
        <Link href="/products" className="mt-4 inline-block">
          <Button variant="outline">← Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <ProductForm
      businessId={product.businessId}
      initialProduct={product}
      onSuccess={() => router.push('/products')}
      onCancel={() => router.push('/products')}
    />
  );
}
