'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { CameraIllustration } from '@/components/illustrations/Illustrations';

interface ProductImageGalleryProps {
  products: Product[];
}

export function ProductImageGallery({ products }: ProductImageGalleryProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  const allImages = products.flatMap((p) =>
    (p.images || []).map((img) => ({
      ...img,
      productName: p.name,
      productId: p.productId,
      price: p.price,
    }))
  );

  const filteredImages =
    selectedProductId === 'all'
      ? allImages
      : allImages.filter((img) => img.productId === selectedProductId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Product Image Library
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Marketing-ready imagery used in AI posters, social ads, and campaign storyboards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900"
          >
            <option value="all">All Product Photos ({allImages.length})</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name}
              </option>
            ))}
          </select>

          <Link href="/products">
            <Button variant="outline">← Back to Catalog</Button>
          </Link>
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
          <CameraIllustration size={40} className="mx-auto text-neutral-400" />
          <h3 className="mt-4 text-lg font-bold text-neutral-900">No photos in media library</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Add product photos when creating or editing items in your catalog.
          </p>
          <Link href="/products/new" className="mt-6 inline-block">
            <Button size="sm">+ Add Product Photo</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredImages.map((img, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.productName}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {img.isPrimary && (
                  <span className="bg-brand-600 absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    Primary
                  </span>
                )}
              </div>
              <div className="space-y-1 p-2">
                <h4 className="truncate text-xs font-bold text-neutral-900">{img.productName}</h4>
                <p className="text-brand-600 text-[11px] font-semibold">₹{img.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
