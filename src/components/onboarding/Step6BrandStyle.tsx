'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { OnboardingFormData, StepErrors } from './types';

interface Step6BrandStyleProps {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: StepErrors;
  onNext: (e: React.FormEvent) => void;
  onBack: () => void;
}

const BRAND_STYLES = [
  {
    id: 'modern',
    title: 'Modern & Clean',
    desc: 'Sleek, professional, modern SaaS aesthetic with clean layout.',
    badge: 'Popular',
    accent: 'from-[#E84D1A]/10 to-amber-100/30 border-orange-300',
    previewBg: 'bg-white border-neutral-200',
    tagBg: 'bg-[#E84D1A] text-white',
  },
  {
    id: 'fun',
    title: 'Fun & Playful',
    desc: 'Vibrant colors, energetic copy, casual & friendly tone.',
    badge: 'High Engagement',
    accent: 'from-amber-100/40 to-[#E84D1A]/15 border-amber-300',
    previewBg: 'bg-amber-50 border-amber-200',
    tagBg: 'bg-amber-500 text-white',
  },
  {
    id: 'premium',
    title: 'Premium & Elegant',
    desc: 'Sophisticated luxury aesthetic, restrained serif typography.',
    badge: 'Luxury',
    accent: 'from-amber-100/60 to-orange-50 border-amber-400',
    previewBg: 'bg-[#1A1A1E] text-white border-neutral-800',
    tagBg: 'bg-amber-400 text-neutral-950',
  },
  {
    id: 'traditional',
    title: 'Traditional',
    desc: 'Warm Indian festive tones, rich heritage visual elements.',
    badge: 'Local Favorite',
    accent: 'from-orange-100/60 to-red-100/40 border-orange-300',
    previewBg: 'bg-orange-950 text-orange-100 border-orange-800',
    tagBg: 'bg-orange-600 text-white',
  },
  {
    id: 'minimal',
    title: 'Minimal',
    desc: 'Understated elegance, generous spacing, razor-sharp focus.',
    badge: 'Clean',
    accent: 'from-[#FAF8F5] to-[#F3EEEA] border-stone-300',
    previewBg: 'bg-neutral-50 border-neutral-300',
    tagBg: 'bg-neutral-900 text-white',
  },
  {
    id: 'bold',
    title: 'Bold & Edgy',
    desc: 'High contrast, aggressive accents, punchy typography.',
    badge: 'High Impact',
    accent: 'from-orange-200/50 to-[#E84D1A]/20 border-orange-400',
    previewBg: 'bg-neutral-900 text-[#E84D1A] border-orange-500',
    tagBg: 'bg-[#E84D1A] text-white',
  },
] as const;

export function Step6BrandStyle({
  form,
  setForm,
  errors: _errors,
  onNext,
  onBack,
}: Step6BrandStyleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Mascot & Guide Column */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
          <span>CHAPTER 6 — Visual Identity</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#1A1A1E] sm:text-3xl">
          Choose your brand style.
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Pick a visual theme that matches your brand vibe. Mitra will render all generated posters,
          ads, and story graphics in this exact style.
        </p>

        {/* Hand-drawn style note */}
        <div className="relative inline-flex w-fit items-center gap-2 rounded-2xl border border-orange-200/60 bg-orange-50/80 px-3.5 py-2 text-xs font-bold text-[#E84D1A]">
          <span>🎨</span>
          <span>Make it yours!</span>
        </div>

        {/* Mascot Pose Scene */}
        <div className="relative mt-1 flex flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm">
          <Mascot state="designer" size="xl" shadow animated />

          <div className="mt-2 w-full rounded-xl border border-orange-200/50 bg-orange-50/70 p-3 text-left text-xs font-semibold text-orange-950">
            ✨ <strong>Zero Design Skills Required:</strong> Mitra automatically handles layouts,
            color palettes, and font pairings.
          </div>
        </div>
      </div>

      {/* Right Interactive Style Grid Column */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Brand Style</h2>
          <p className="text-sm text-neutral-500">
            Pick a style that matches your vibe. You can change it anytime in settings.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BRAND_STYLES.map((style) => {
              const isSelected = form.contentStyle === style.id || form.contentStyle === style.id;

              return (
                <motion.button
                  key={style.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      contentStyle: style.id,
                    }))
                  }
                  whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className={`relative cursor-pointer overflow-hidden rounded-3xl border p-4 text-left transition-all ${
                    isSelected
                      ? `bg-gradient-to-br ${style.accent} scale-[1.02] border-[#E84D1A] shadow-lg ring-2 ring-[#E84D1A]/20`
                      : 'border-neutral-200/90 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${style.tagBg}`}
                    >
                      {style.badge}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E84D1A] text-xs font-bold text-white shadow-xs">
                        ✓
                      </span>
                    )}
                  </div>

                  <span className="mb-1 block text-base font-extrabold text-[#1A1A1E]">
                    {style.title}
                  </span>
                  <p className="mb-3 text-xs leading-relaxed text-neutral-500">{style.desc}</p>

                  {/* Mini Card Style Preview Mockup */}
                  <div
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-[11px] font-bold ${style.previewBg}`}
                  >
                    <span>Sample Ad Poster</span>
                    <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px]">
                      PREVIEW
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="rounded-2xl border border-neutral-200 px-6 py-3 font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="rounded-2xl bg-[#E84D1A] px-8 py-3.5 font-bold text-white shadow-md shadow-orange-600/20 hover:bg-[#d03f10]"
            >
              Continue →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
