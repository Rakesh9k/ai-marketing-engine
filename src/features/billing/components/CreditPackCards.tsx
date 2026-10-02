'use client';

import { CREDIT_PACK_SIZES, getPackPriceId, type PaddleCatalog } from '@/lib/paddle/catalog';
import type { PaddlePricesState } from '../usePaddlePrices';
import { PaddlePrice } from './PaddlePrice';

const PACK_LABELS: Record<number, string> = {
  500: 'Small Pack',
  1200: 'Medium Pack',
  3000: 'Large Pack',
};

/**
 * One-time credit top-ups. Credits come from the pack size (mapped server-side from the
 * Paddle price ID) — never from the amount paid. Price text is Paddle's formatted total.
 */
export function CreditPackCards({
  catalog,
  prices,
  pendingKey,
  onBuy,
  disabled = false,
}: {
  catalog: PaddleCatalog;
  prices: PaddlePricesState;
  pendingKey: string | null;
  onBuy: (credits: number, priceId: string) => void;
  /** Disable purchases (e.g. while the customer's entitlement could not be loaded). */
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CREDIT_PACK_SIZES.map((credits) => {
        const priceId = getPackPriceId(catalog, credits);
        const isPending = pendingKey === `pack:${credits}`;
        const ready =
          prices.status === 'ready' && !!priceId && prices.prices[priceId] !== undefined;

        return (
          <div
            key={credits}
            className="hover:border-brand-300 flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/80 p-5 text-center transition-all hover:bg-white"
          >
            <div>
              <span className="bg-brand-100 text-brand-800 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {PACK_LABELS[credits]}
              </span>
              <p className="mt-2 text-2xl font-black text-neutral-900">
                {credits.toLocaleString('en-IN')} Credits
              </p>
              <p className="text-brand-600 mt-1 text-xl font-bold">
                <PaddlePrice state={prices} priceId={priceId} />
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">
                One-time · valid this calendar month
              </p>
            </div>
            <button
              type="button"
              onClick={() => priceId && onBuy(credits, priceId)}
              disabled={!ready || pendingKey !== null || disabled}
              className="bg-brand-600 hover:bg-brand-700 mt-4 w-full rounded-lg px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-60"
            >
              {isPending ? 'Opening checkout…' : `Buy ${credits} Credits`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
