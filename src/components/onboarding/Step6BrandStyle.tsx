'use client';

import Image from 'next/image';
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
    accent: 'from-slate-100 to-amber-50 border-amber-400',
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
    accent: 'from-neutral-100 to-neutral-200/50 border-neutral-300',
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
  errors,
  onNext,
  onBack,
}: Step6BrandStyleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Mascot & Guide Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold uppercase tracking-wider">
          <span>CHAPTER 6 — Visual Identity</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1E] tracking-tight">
          Choose your brand style.
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Pick a visual theme that matches your brand vibe. Mitra will render all generated posters, ads, and story graphics in this exact style.
        </p>

        {/* Hand-drawn style note */}
        <div className="relative inline-flex items-center gap-2 text-xs font-bold text-[#E84D1A] bg-orange-50/80 border border-orange-200/60 px-3.5 py-2 rounded-2xl w-fit">
          <span>🎨</span>
          <span>Make it yours!</span>
        </div>

        {/* Mascot Pose Scene */}
        <div className="mt-1 p-5 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-3xl shadow-sm relative overflow-hidden text-center flex flex-col items-center">
          <Mascot state="designer" size="xl" shadow animated />

          <div className="mt-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/50 text-xs font-semibold text-orange-950 text-left w-full">
            ✨ <strong>Zero Design Skills Required:</strong> Mitra automatically handles layouts, color palettes, and font pairings.
          </div>
        </div>
      </div>

      {/* Right Interactive Style Grid Column */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Brand Style</h2>
          <p className="text-sm text-neutral-500">
            Pick a style that matches your vibe. You can change it anytime in settings.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className={`relative p-4 rounded-3xl border text-left transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? `bg-gradient-to-br ${style.accent} border-[#E84D1A] ring-2 ring-[#E84D1A]/20 shadow-lg scale-[1.02]`
                      : 'bg-white border-neutral-200/90 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${style.tagBg}`}>
                      {style.badge}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#E84D1A] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        ✓
                      </span>
                    )}
                  </div>

                  <span className="block text-base font-extrabold text-[#1A1A1E] mb-1">
                    {style.title}
                  </span>
                  <p className="text-xs text-neutral-500 leading-relaxed mb-3">{style.desc}</p>

                  {/* Mini Card Style Preview Mockup */}
                  <div className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between ${style.previewBg}`}>
                    <span>Sample Ad Poster</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20">PREVIEW</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex items-center justify-between gap-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="px-6 py-3 rounded-2xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-[#E84D1A] hover:bg-[#d03f10] text-white font-bold shadow-md shadow-orange-600/20"
            >
              Continue →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
