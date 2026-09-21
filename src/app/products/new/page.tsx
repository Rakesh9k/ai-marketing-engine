'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';
import { callFunction } from '@/services/api';
import { ImageUploader } from '@/features/asset/components/ImageUploader';
import type { Asset } from '@/features/asset/services/assetService';
import { Button } from '@/components/ui/Button';
import type { Business } from '@/types';

const PRODUCT_CATEGORIES = [
  { value: 'starter', label: 'Starter' },
  { value: 'main', label: 'Main' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'combo', label: 'Combo' },
  { value: 'service', label: 'Service' },
  { value: 'package', label: 'Package' },
] as const;

type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]['value'];

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('main');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    image?: string;
    general?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadBusinesses() {
      try {
        const data = await businessService.getByUserId(user!.uid);
        setBusinesses(data);
        if (data.length > 0) {
          setBusinessId(data[0]!.businessId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBusinesses(false);
      }
    }
    void loadBusinesses();
  }, [user]);

  const handleUploadComplete = (uploadedAsset: Asset) => {
    setAsset(uploadedAsset);
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const handleUploadError = (error: Error) => {
    setErrors((prev) => ({ ...prev, image: error.message }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: typeof errors = {};
    if (!name.trim()) {
      nextErrors.name = 'Product name is required';
    }
    const priceValue = Number(price);
    if (!price || Number.isNaN(priceValue) || priceValue <= 0) {
      nextErrors.price = 'Enter a valid price';
    }
    if (!asset) {
      nextErrors.image = 'Upload a product photo';
    }
    if (!businessId) {
      nextErrors.general = 'Select a business first';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      await callFunction({
        functionName: 'createProduct',
        data: {
          businessId,
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceValue,
          category,
          images: [
            {
              url: asset!.previewUrl,
              storagePath: asset!.storagePath,
              isPrimary: true,
            },
          ],
        },
      });
      router.push('/products');
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({
        ...prev,
        general: err instanceof Error ? err.message : 'Failed to save product',
      }));
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingBusinesses) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="bg-bg-primary min-h-screen p-8 text-center">
        <p className="text-neutral-500">You need to set up a business before adding products.</p>
        <a href="/onboarding" className="mt-4 inline-block">
          <Button>Set up business</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Add Product</h1>
        <p className="mt-1 text-neutral-500">Add a menu item so you can create campaigns for it.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-lg border border-neutral-200 bg-white p-6"
      >
        {businesses.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-neutral-900">Business</label>
            <select
              value={businessId || ''}
              onChange={(e) => setBusinessId(e.target.value)}
              className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            >
              {businesses.map((business) => (
                <option key={business.businessId} value={business.businessId}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-900">Product Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            required
            placeholder="e.g., Chicken Biryani"
            className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
          />
          {errors.name && <p className="text-error-600 mt-1 text-sm">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900">Price (₹) *</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min="1"
            step="1"
            required
            placeholder="e.g., 299"
            className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
          />
          {errors.price && <p className="text-error-600 mt-1 text-sm">{errors.price}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Optional description of the dish"
            className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-400">{description.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900">Product Photo *</label>
          <div className="mt-1">
            {user && businessId && (
              <ImageUploader
                userId={user.uid}
                businessId={businessId}
                assetType="product"
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            )}
          </div>
          {errors.image && <p className="text-error-600 mt-1 text-sm">{errors.image}</p>}
        </div>

        {errors.general && <p className="text-error-600 text-sm">{errors.general}</p>}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/products')}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
