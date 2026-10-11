'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { CameraIllustration } from '@/components/illustrations/Illustrations';

interface ProductInspectorPanelProps {
  product: Product;
  onEdit: (product: Product) => void;
  onCreateCreative: (product: Product) => void;
  onCreateCampaign: (product: Product) => void;
}

export function ProductInspectorPanel({
  product,
  onEdit,
  onCreateCreative,
  onCreateCampaign,
}: ProductInspectorPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(true);

  const isVeg = product.attributes?.veg ?? false;
  const isBestseller = product.tags?.includes('Bestseller') || product.tags?.includes('bestseller');
  const primaryImage = product.images?.[0]?.url;

  return (
    <div className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* Product Image Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-100">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-50 text-neutral-400">
            <CameraIllustration size={40} />
            <span className="mt-2 text-xs font-medium">No photo uploaded</span>
          </div>
        )}

        {isBestseller && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-md">
            🔥 Bestseller
          </span>
        )}
      </div>

      {/* Product Title & Badges */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {isVeg ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Veg
            </span>
          ) : (
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
              Non-Veg
            </span>
          )}
          {product.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <h2 className="mt-2 text-xl font-extrabold text-neutral-900">{product.name}</h2>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-brand-600 text-2xl font-black">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-neutral-400 line-through">
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">{product.description}</p>
        )}
      </div>

      {/* Offer Eligibility Box */}
      <div className="space-y-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
          <span className="text-emerald-600">✓</span>
          <span>Offer Eligibility</span>
        </div>
        <p className="text-xs text-emerald-800">
          Included in Weekend Special (20% OFF) • Valid: Sat - Sun
        </p>
        <p className="text-[11px] font-medium text-emerald-600">Auto-applies to all customers</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
          Edit Product
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onCreateCreative(product)}>
          View Analytics
        </Button>
      </div>

      {/* Accordion / Collapsible Info Sections */}
      <div className="space-y-3 border-t border-neutral-100 pt-2">
        {/* Product Details Accordion */}
        <div className="border-b border-neutral-100 pb-3">
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex w-full items-center justify-between text-xs font-bold text-neutral-900"
          >
            <span>📄 Product Details</span>
            <span>{detailsOpen ? '▲' : '▼'}</span>
          </button>
          {detailsOpen && (
            <div className="mt-2 space-y-1 text-xs text-neutral-600">
              <p>
                <span className="font-semibold text-neutral-800">Status:</span> {product.status}
              </p>
              <p>
                <span className="font-semibold text-neutral-800">Currency:</span> {product.currency}
              </p>
              <p>
                <span className="font-semibold text-neutral-800">Product ID:</span>{' '}
                {product.productId}
              </p>
            </div>
          )}
        </div>

        {/* Images Accordion */}
        <div className="border-b border-neutral-100 pb-3">
          <button
            type="button"
            onClick={() => setImagesOpen(!imagesOpen)}
            className="flex w-full items-center justify-between text-xs font-bold text-neutral-900"
          >
            <span>🖼️ Images ({product.images?.length || 0})</span>
            <span>{imagesOpen ? '▲' : '▼'}</span>
          </button>
          {imagesOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.images?.map((img, idx) => (
                <div
                  key={idx}
                  className="h-12 w-12 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Preview ${idx}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              {(!product.images || product.images.length === 0) && (
                <p className="text-xs text-neutral-400">No images uploaded.</p>
              )}
            </div>
          )}
        </div>

        {/* Tags Accordion */}
        <div className="border-b border-neutral-100 pb-3">
          <button
            type="button"
            onClick={() => setTagsOpen(!tagsOpen)}
            className="flex w-full items-center justify-between text-xs font-bold text-neutral-900"
          >
            <span>🏷️ Tags</span>
            <span>{tagsOpen ? '▲' : '▼'}</span>
          </button>
          {tagsOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.tags?.map((t) => (
                <span
                  key={t}
                  className="bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Category Accordion */}
        <div className="pb-2">
          <button
            type="button"
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="flex w-full items-center justify-between text-xs font-bold text-neutral-900"
          >
            <span>📁 Category</span>
            <span>{categoryOpen ? '▲' : '▼'}</span>
          </button>
          {categoryOpen && (
            <p className="mt-2 text-xs font-semibold text-neutral-700">{product.category}</p>
          )}
        </div>
      </div>

      {/* AI Insight Box */}
      <div className="space-y-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
          <span>✨ AI Insight</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-800">
          This is your top performing product! It drives 32% of total sales and has the highest
          engagement rate on social posters.
        </p>
        <Button
          size="sm"
          className="bg-brand-600 hover:bg-brand-700 w-full text-xs font-bold text-white"
          onClick={() => onCreateCampaign(product)}
        >
          Create Campaign →
        </Button>
      </div>
    </div>
  );
}
