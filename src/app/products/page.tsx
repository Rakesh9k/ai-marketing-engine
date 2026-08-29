'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, productService } from '@/services/database';
import type { Business, Product } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-neutral-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M20 6L12 2L4 6L4 18L12 22L20 18L20 6Z" />
        <path d="M12 22V12" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusinesses() {
      if (!user) return;
      try {
        const businessesData = await businessService.getByUserId(user.uid);
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          const firstBusiness = businessesData[0]!;
          setSelectedBusinessId(firstBusiness.businessId);
        }
      } catch (err) {
        console.error(err);
      }
    }
    void loadBusinesses();
  }, [user]);

  useEffect(() => {
    if (selectedBusinessId && user) {
      const businessId = selectedBusinessId;
      async function loadProducts() {
        try {
          setLoading(true);
          const productsData = await productService.listByBusiness(businessId);
          setProducts(productsData);
        } catch (err) {
          console.error(err);
          setError('Failed to load products');
        } finally {
          setLoading(false);
        }
      }
      void loadProducts();
    }
  }, [selectedBusinessId, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  const __handleSelectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId);
  };
  void __handleSelectBusiness;

  // Extract products list rendering to avoid nested ternary issues
  const productsList =
    products.length === 0 ? (
      <EmptyState
        title="No products yet"
        description="Add your first product to start creating campaigns"
        action={
          <Link href="/products/new">
            <button className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Product
            </button>
          </Link>
        }
      />
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div
            key={product.productId}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:bg-neutral-50"
          >
            <div className="relative aspect-square bg-neutral-100">
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    className="h-12 w-12 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="truncate font-medium text-neutral-900">{product.name}</h3>
              <p className="text-brand-600 mt-1 text-sm font-medium">
                ₹{product.price.toLocaleString('en-IN')}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="bg-brand-100 text-brand-700 rounded-full px-2 py-0.5 text-xs capitalize">
                  {product.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${product.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-700'}`}
                >
                  {product.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
          <p className="mt-1 text-neutral-500">Manage your menu items and services</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBusinessId || ''}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none sm:w-64"
            aria-label="Select business"
          >
            {businesses.map((business) => (
              <option key={business.businessId} value={business.businessId}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {businesses.length === 0 ? (
        <EmptyState
          title="No business set up yet"
          description="Create your first business to start adding products"
          action={
            <a href="/onboarding/business">
              <button className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Business
              </button>
            </a>
          }
        />
      ) : (
        <div>
          <div className="mb-4 flex justify-end">
            <Link href="/products/new">
              <Button>Add Product</Button>
            </Link>
          </div>
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="Add your first product to start creating campaigns"
              action={
                <Link href="/products/new">
                  <button className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Product
                  </button>
                </Link>
              }
            />
          ) : (
            productsList
          )}
        </div>
      )}
    </div>
  );
}
