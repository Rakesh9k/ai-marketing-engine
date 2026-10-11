'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';

export interface HookVariant {
  id: 'urgent' | 'curiosity' | 'social_proof';
  label: string;
  badge: string;
  badgeBg: string;
  headline: string;
  subtext: string;
  predictedConversion: string;
}

interface SideBySideHookABGeneratorProps {
  topicPrompt: string;
  currentHeadline: string;
  onSelectHook: (headline: string) => void;
}

const INITIAL_HOOK_VARIANTS: HookVariant[] = [
  {
    id: 'urgent',
    label: 'Variant A: Urgency & Offer',
    badge: '⚡ High Conversion',
    badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
    headline: '🔥 20% OFF Weekend Biryani Special — 2 Days Only!',
    subtext: 'Triggers instant urgency with clear discount and time limit.',
    predictedConversion: '9.4% CTR',
  },
  {
    id: 'curiosity',
    label: 'Variant B: Curiosity & Hook',
    badge: '💡 Story Driven',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
    headline: 'Craving Authentic Hyderabadi Biryani This Weekend?',
    subtext: 'Hooks the reader with a relatable question and emotional craving.',
    predictedConversion: '8.7% CTR',
  },
  {
    id: 'social_proof',
    label: 'Variant C: Local Social Proof',
    badge: '⭐ Local Favorite',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
    headline: 'Hyderabad’s Most Loved Biryani Combo is Here!',
    subtext: 'Leverages local community trust and popular favorite status.',
    predictedConversion: '9.1% CTR',
  },
];

export function SideBySideHookABGenerator({
  topicPrompt,
  currentHeadline,
  onSelectHook,
}: SideBySideHookABGeneratorProps) {
  const [variants, setVariants] = useState<HookVariant[]>(INITIAL_HOOK_VARIANTS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleGenerateFreshHooks = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const topic = topicPrompt || 'Special Offer';
      setVariants([
        {
          id: 'urgent',
          label: 'Variant A: Urgency & Offer',
          badge: '⚡ High Conversion',
          badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
          headline: `⚡ Don't Miss Out: Exclusive Deals on ${topic}!`,
          subtext: 'Direct offer CTA designed for immediate clicks.',
          predictedConversion: '9.5% CTR',
        },
        {
          id: 'curiosity',
          label: 'Variant B: Curiosity & Hook',
          badge: '💡 Story Driven',
          badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
          headline: `Discover Why Everyone in Town is Talking About ${topic}!`,
          subtext: 'High engagement hook designed for social curiosity.',
          predictedConversion: '8.9% CTR',
        },
        {
          id: 'social_proof',
          label: 'Variant C: Local Social Proof',
          badge: '⭐ Local Favorite',
          badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
          headline: `Join 1,000+ Happy Customers Enjoying ${topic}!`,
          subtext: 'Builds instant authority with social proof numbers.',
          predictedConversion: '9.3% CTR',
        },
      ]);
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Side-by-Side Hook A/B Generator
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare 3 AI headline variations side-by-side to pick the highest converting copy.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleGenerateFreshHooks}
          loading={isGenerating}
          disabled={isGenerating}
          className="shrink-0 bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-600"
        >
          ✨ Generate 3 Fresh Hooks
        </Button>
      </div>

      {/* 3-Column Side-by-Side Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AnimatePresence mode="wait">
          {variants.map((v) => {
            const isSelected = currentHeadline === v.headline || selectedId === v.id;

            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  setSelectedId(v.id);
                  onSelectHook(v.headline);
                }}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-amber-950/30'
                    : 'border-slate-200 bg-white hover:border-amber-300 dark:border-slate-800 dark:bg-slate-950'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {v.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${v.badgeBg}`}>
                      {v.badge}
                    </span>
                  </div>

                  <p className="text-xs leading-snug font-extrabold text-slate-900 dark:text-white">
                    {v.headline}
                  </p>

                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {v.subtext}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Est: {v.predictedConversion}
                  </span>
                  <button
                    type="button"
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : 'Use Hook →'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
