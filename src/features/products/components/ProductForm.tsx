'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { productService } from '@/services/database';
import { CameraIllustration } from '@/components/illustrations/Illustrations';

interface ProductFormProps {
  businessId: string;
  initialProduct?: Product | null;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
}

const CATEGORY_OPTIONS = [
  'Biryani & Rice',
  'Starters & Tandoor',
  'Main Course',
  'Combos & Thalis',
  'Beverages & Drinks',
  'Desserts & Sweets',
  'Services & Packages',
  'Properties & Units',
  'Other',
];

export function ProductForm({ businessId, initialProduct, onSuccess, onCancel }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialProduct);

  const [name, setName] = useState(initialProduct?.name || '');
  const [category, setCategory] = useState(initialProduct?.category || 'Biryani & Rice');
  const [price, setPrice] = useState<number>(initialProduct?.price || 0);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(
    initialProduct?.originalPrice
  );
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [imageUrl, setImageUrl] = useState(initialProduct?.images?.[0]?.url || '');
  const [isVeg, setIsVeg] = useState<boolean>(initialProduct?.attributes?.veg ?? false);
  const [isBestseller, setIsBestseller] = useState<boolean>(
    initialProduct?.tags?.includes('Bestseller') ?? false
  );
  const [isPopular, setIsPopular] = useState<boolean>(
    initialProduct?.tags?.includes('Popular') ?? false
  );
  const [marketingNote, setMarketingNote] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate readiness items
  const readiness = {
    hasName: Boolean(name.trim()),
    hasPrice: price > 0,
    hasDescription: Boolean(description.trim()),
    hasImage: Boolean(imageUrl.trim()),
  };
  const readinessScore =
    (readiness.hasName ? 25 : 0) +
    (readiness.hasPrice ? 25 : 0) +
    (readiness.hasDescription ? 25 : 0) +
    (readiness.hasImage ? 25 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price <= 0) {
      setError('Please provide a valid product name and price.');
      return;
    }

    setSaving(true);
    setError(null);

    const tags: string[] = [];
    if (isBestseller) tags.push('Bestseller');
    if (isPopular) tags.push('Popular');

    const cleanName = name.trim();
    const cleanCategory = category.trim() || 'Biryani & Rice';
    const cleanDescription = description.trim() || undefined;
    const cleanOriginalPrice = originalPrice && originalPrice > 0 ? originalPrice : undefined;
    const images = imageUrl.trim() ? [{ url: imageUrl.trim(), storagePath: '', isPrimary: true }] : [];

    try {
      if (isEditing && initialProduct) {
        const updateData: Partial<Product> & { businessId?: string } = {
          businessId,
          name: cleanName,
          category: cleanCategory,
          price,
          originalPrice: cleanOriginalPrice,
          description: cleanDescription,
          tags,
          images,
          attributes: {
            ...initialProduct.attributes,
            veg: isVeg,
          },
        };
        const saved = await productService.update(initialProduct.productId, updateData);
        if (onSuccess) onSuccess(saved);
        else router.push('/products');
      } else {
        const productInput = {
          businessId,
          name: cleanName,
          category: cleanCategory,
          price,
          originalPrice: cleanOriginalPrice,
          currency: 'INR' as const,
          description: cleanDescription,
          tags,
          variants: [],
          images,
          attributes: {
            veg: isVeg,
          },
          status: 'active' as const,
          sortOrder: 0,
        };
        const saved = await productService.create(productInput);
        if (onSuccess) onSuccess(saved);
        else router.push('/products');
      }
    } catch (err: any) {
      console.error('Failed to save product:', err);
      const details = err?.details?.fields ? ` Check fields: ${err.details.fields.join(', ')}` : '';
      setError(
        err?.message && err.message !== 'Invalid input'
          ? err.message
          : `We couldn't save this product.${details} Please check the details and try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {isEditing ? 'Edit Product' : 'Add something Mitra can market'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Tell Mitra about this item once. Mitra will use it in campaign copy, poster visual
            generation, and AI recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Marketing Readiness Progress Card */}
      <div className="to-brand-50/40 space-y-3 rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h3 className="text-sm font-bold text-neutral-900">Marketing Readiness Indicator</h3>
          </div>
          <span className="bg-brand-600 rounded-full px-3 py-1 text-xs font-bold text-white">
            {readinessScore}% Ready
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="bg-brand-500 h-full transition-all duration-300"
            style={{ width: `${readinessScore}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-medium sm:grid-cols-4">
          <span className={readiness.hasName ? 'font-bold text-emerald-700' : 'text-neutral-400'}>
            {readiness.hasName ? '✓ Name' : '○ Name'}
          </span>
          <span className={readiness.hasPrice ? 'font-bold text-emerald-700' : 'text-neutral-400'}>
            {readiness.hasPrice ? '✓ Price' : '○ Price'}
          </span>
          <span
            className={readiness.hasDescription ? 'font-bold text-emerald-700' : 'text-neutral-400'}
          >
            {readiness.hasDescription ? '✓ Description' : '○ Description'}
          </span>
          <span className={readiness.hasImage ? 'font-bold text-emerald-700' : 'text-neutral-400'}>
            {readiness.hasImage ? '✓ Photo' : '○ Photo'}
          </span>
        </div>
      </div>

      {/* 1. Product Identity */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-neutral-100 pb-3 text-lg font-bold text-neutral-900">
          1. Product Identity
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Product or Service Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Special Hyderabadi Dum Biryani"
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Customer Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe it the way you'd explain it to a customer. Mitra uses this in campaign captions..."
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* 2. Pricing */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-neutral-100 pb-3 text-lg font-bold text-neutral-900">
          2. Pricing & Offers
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Selling Price (₹) *"
            type="number"
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="299"
            required
          />
          <Input
            label="Original / Compare-At Price (₹) Optional"
            type="number"
            value={originalPrice || ''}
            onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="399"
          />
        </div>
      </div>

      {/* 3. Product Photo */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-neutral-100 pb-3 text-lg font-bold text-neutral-900">
          3. Product Photo & Visuals
        </h2>

        <Input
          label="Product Photo Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://images.unsplash.com/... or paste image URL"
        />

        {imageUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-[4/3] max-w-sm overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
              <span className="font-bold">⚠️ Experimental:</span>
              <span>
                Automatic AI product extraction & studio relighting is currently in preview. For best results in posters and reels, ensure the photo has clear contrast between the product and background.
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center">
            <CameraIllustration size={36} className="mx-auto text-neutral-400" />
            <p className="mt-2 text-xs text-neutral-500">
              Provide an image URL above to display product photos in social posters and campaign
              creatives.
            </p>
          </div>
        )}
      </div>

      {/* 4. Product Attributes & Tags */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-neutral-100 pb-3 text-lg font-bold text-neutral-900">
          4. Attributes & Marketing Tags
        </h2>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 hover:border-neutral-300">
            <input
              type="checkbox"
              checked={isVeg}
              onChange={(e) => setIsVeg(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-semibold text-neutral-900">Vegetarian Item</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 hover:border-neutral-300">
            <input
              type="checkbox"
              checked={isBestseller}
              onChange={(e) => setIsBestseller(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-semibold text-neutral-900">Mark as Bestseller</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 hover:border-neutral-300">
            <input
              type="checkbox"
              checked={isPopular}
              onChange={(e) => setIsPopular(e.target.checked)}
              className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm font-semibold text-neutral-900">Mark as Popular</span>
          </label>
        </div>
      </div>

      {/* 5. Marketing Notes */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-neutral-100 pb-3 text-lg font-bold text-neutral-900">
          5. Marketing Notes for Mitra AI
        </h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Anything Mitra should know when marketing this item?
          </label>
          <textarea
            value={marketingNote}
            onChange={(e) => setMarketingNote(e.target.value)}
            rows={2}
            placeholder="e.g. Always emphasize slow cooked authenticity and royal Hyderabadi recipe..."
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
