'use client';

import type { Product } from '@/types';
import { InteractiveCard } from '@/components/motion/InteractiveCard';
import { CameraIllustration } from '@/components/illustrations/Illustrations';

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onSelect: (product: Product) => void;
  onCreateCreative: (product: Product) => void;
}

export function ProductCard({ product, isSelected, onSelect, onCreateCreative }: ProductCardProps) {
  const isVeg = product.attributes?.veg ?? false;
  const isBestseller = product.tags?.includes('Bestseller') || product.tags?.includes('bestseller');
  const isPopular = product.tags?.includes('Popular') || product.tags?.includes('popular');

  const imageUrl = product.images?.[0]?.url;

  return (
    <InteractiveCard
      bare
      maxTilt={4}
      onClick={() => onSelect(product)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-shadow ${
        isSelected
          ? 'border-brand-500 ring-brand-500/20 shadow-md ring-2'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
      }`}
    >
      {/* Product Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 text-neutral-400">
            <CameraIllustration size={32} />
            <span className="mt-2 text-xs font-medium">No photo added</span>
          </div>
        )}

        {/* Top Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isBestseller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              🔥 Bestseller
            </span>
          )}
          {isVeg ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Veg
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Non-Veg
            </span>
          )}
        </div>

        {/* Favorite Icon button */}
        <button
          type="button"
          aria-label="Bookmark product"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-neutral-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-red-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Card Details */}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="group-hover:text-brand-600 line-clamp-1 font-bold text-neutral-900 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Category & Tag Badges */}
        <div className="flex flex-wrap gap-1">
          {product.category && (
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
              {product.category}
            </span>
          )}
          {isPopular && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Popular
            </span>
          )}
        </div>

        {/* Price & Sales info */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-brand-600 text-lg font-black">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-neutral-400 line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
            <span>★ 4.8</span>
          </div>
        </div>

        {product.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500">
            {product.description}
          </p>
        )}

        {/* Marketing Readiness Indicator */}
        <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ready for marketing
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateCreative(product);
            }}
            className="text-brand-600 hover:text-brand-700 text-xs font-bold hover:underline"
          >
            Create Creative →
          </button>
        </div>
      </div>
    </InteractiveCard>
  );
}
