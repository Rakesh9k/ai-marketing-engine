'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { SideBySideHookABGenerator } from './SideBySideHookABGenerator';

interface PosterGeneratorStudioProps {
  userId: string;
}

interface PosterDraftState {
  headline: string;
  discountTag: string;
  price: string;
  originalPrice: string;
  terms: string;
  ctaText: string;
}

const INITIAL_POSTER_DRAFT: PosterDraftState = {
  headline: 'Weekend Biryani Feast',
  discountTag: '20% OFF',
  price: '299',
  originalPrice: '349',
  terms: 'Valid on dine-in & takeaway',
  ctaText: 'Order on WhatsApp 💬',
};

export function PosterGeneratorStudio({ userId: _userId }: PosterGeneratorStudioProps) {
  const { draft, updateField, isRestored, clearDraft, dismissRestoredNotice, lastSavedAt } =
    useDraftAutoSave<PosterDraftState>({
      draftKey: 'poster-generator-studio',
      initialState: INITIAL_POSTER_DRAFT,
    });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 text-slate-900 sm:p-6 dark:text-slate-100">
      {/* Restored Draft Auto-Save Notification */}
      {isRestored && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span>💾</span>
            <span>
              <strong>Restored unsaved poster draft!</strong>
              {lastSavedAt && (
                <span className="ml-1 text-[11px] opacity-75">
                  (Auto-saved at {lastSavedAt.toLocaleTimeString()})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={dismissRestoredNotice}
              className="rounded-lg px-2.5 py-1 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              Keep Draft
            </button>
            <button
              onClick={clearDraft}
              className="rounded-lg bg-amber-200 px-2.5 py-1 font-bold text-amber-950 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100"
            >
              Discard & Reset
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/creative"
            className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
          >
            ← Creative Studio
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Poster Generator Studio
          </h1>
        </div>

        {lastSavedAt && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            ✓ Auto-saved
          </span>
        )}
      </div>

      {/* Side-by-Side Hook A/B Generator */}
      <SideBySideHookABGenerator
        topicPrompt={draft.headline}
        currentHeadline={draft.headline}
        onSelectHook={(newHeadline) => updateField('headline', newHeadline)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form Inputs */}
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              Poster Details & Copy
            </h3>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Headline
              </label>
              <input
                value={draft.headline}
                onChange={(e) => updateField('headline', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Discount Tag
                </label>
                <input
                  value={draft.discountTag}
                  onChange={(e) => updateField('discountTag', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Offer Price (₹)
                </label>
                <input
                  value={draft.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Original Price (₹)
                </label>
                <input
                  value={draft.originalPrice}
                  onChange={(e) => updateField('originalPrice', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CTA Badge
                </label>
                <input
                  value={draft.ctaText}
                  onChange={(e) => updateField('ctaText', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Terms / Notes
              </label>
              <input
                value={draft.terms}
                onChange={(e) => updateField('terms', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Center Visual Live Poster Canvas */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <div className="relative flex aspect-square w-full max-w-md flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-amber-600/40 via-slate-900 to-black p-6 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
                alt="Poster"
                className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-overlay"
              />

              <div className="relative z-10 self-start">
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black tracking-wider text-slate-950 uppercase">
                  {draft.discountTag}
                </span>
              </div>

              <div className="relative z-10 space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-white backdrop-blur-md">
                <h3 className="text-lg leading-tight font-extrabold">{draft.headline}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-amber-400">₹{draft.price}</span>
                  {draft.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      ₹{draft.originalPrice}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{draft.terms}</p>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs font-bold text-amber-300">
                  <span>{draft.ctaText}</span>
                  <span className="text-[10px] text-slate-400">Hyderabad Biryani House</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-600">
                ✓ Approve Poster
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
