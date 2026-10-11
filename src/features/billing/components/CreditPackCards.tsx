'use client';

import { CREDIT_PACKS as PACKS } from '@/lib/config/pricing';

export function CreditPackCards({
  pendingKey,
  onBuy,
  disabled = false,
}: {
  pendingKey: string | null;
  onBuy: (credits: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {PACKS.map((pack) => {
        const credits = pack.credits;
        const priceINR = pack.priceINR;
        const isPending = pendingKey === `pack:${credits}`;

        return (
          <div
            key={credits}
            className="hover:border-brand-300 flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/80 p-5 text-center transition-all hover:bg-white"
          >
            <div>
              <span className="bg-brand-100 text-brand-800 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {pack.label}
              </span>
              <p className="mt-2 text-2xl font-black text-neutral-900">
                {credits.toLocaleString('en-IN')} Credits
              </p>
              <p className="text-brand-600 mt-1 text-xl font-bold">
                ₹{priceINR.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">
                One-time · valid this calendar month
              </p>
            </div>
            <button
              type="button"
              onClick={() => onBuy(credits)}
              disabled={pendingKey !== null || disabled}
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
