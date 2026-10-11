'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface StyleCopy {
  headline: string;
  styleBadge: string;
}

const DEFAULT_STYLE_COPY: StyleCopy = {
  headline: '"Biryani missing from Sunday? That should be illegal 🍗 Order now or cry later!"',
  styleBadge: '🎯 Funny & Quirky Mode',
};

const styleDemoCopy: Record<string, StyleCopy> = {
  quirky: DEFAULT_STYLE_COPY,
  pro: {
    headline:
      '"Experience authentic Hyderabadi culinary perfection. Prepared with premium ingredients for family gatherings."',
    styleBadge: '💼 Professional Mode',
  },
  trendy: {
    headline: '"Sunday Biryani Hits Different 🔥 Tag your foodie bestie who owes you a meal!"',
    styleBadge: '⚡ Trendy & Modern Mode',
  },
  festive: {
    headline:
      '"Celebrate this festive season with authentic feast combos made for the whole family to enjoy together."',
    styleBadge: '🎉 Festive Celebration Mode',
  },
  premium: {
    headline:
      '"Artisanal Dum Biryani cooked over slow wood-fire coals. A luxury culinary journey for discerning palates."',
    styleBadge: '✨ Premium Luxury Mode',
  },
};

export function TransformationSection() {
  const reduceMotion = useReducedMotion();
  const [selectedStyle, setSelectedStyle] = useState<string>('quirky');

  const styles = [
    {
      id: 'quirky',
      label: 'Funny & Quirky',
      icon: '🎯',
      desc: 'Playful, meme-inspired local humor that gets shared.',
    },
    {
      id: 'pro',
      label: 'Serious & Professional',
      icon: '💼',
      desc: 'Clean, trust-focused corporate & business tone.',
    },
    {
      id: 'trendy',
      label: 'Trendy & Modern',
      icon: '⚡',
      desc: 'High-energy Gen-Z & Instagram aesthetic.',
    },
    {
      id: 'festive',
      label: 'Festive & Celebration',
      icon: '🎉',
      desc: 'Warm Diwali, Eid, Sankranti festival messaging.',
    },
    {
      id: 'premium',
      label: 'Premium & Elegant',
      icon: '✨',
      desc: 'Luxury editorial presentation for high-end services.',
    },
  ];

  const currentStyleCopy: StyleCopy = styleDemoCopy[selectedStyle] ?? DEFAULT_STYLE_COPY;

  return (
    <section className="bg-bg-primary py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            Creative Style Intelligence
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Choose your brand’s personality.
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            Mitra adapts copy tone and visual presentation to match your exact brand identity — from
            casual and funny to ultra-premium.
          </p>
        </div>

        {/* Style Selector Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                selectedStyle === s.id
                  ? 'bg-brand-600 shadow-brand-500/20 scale-105 text-white shadow-md'
                  : 'bg-surface border-border-light text-text-secondary hover:border-brand-500 border'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Live Style Output Card */}
        <div className="border-brand-200 bg-surface mx-auto mt-8 max-w-2xl rounded-3xl border p-6 text-center shadow-xl">
          <span className="bg-brand-50 text-brand-700 inline-block rounded-full px-3 py-1 text-xs font-bold">
            {currentStyleCopy.styleBadge}
          </span>
          <p className="text-text-primary mt-4 text-lg leading-relaxed font-bold italic">
            {currentStyleCopy.headline}
          </p>
        </div>

        {/* BEFORE & AFTER DRAMATIC TRANSFORMATION */}
        <div className="mt-20">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h3 className="text-text-primary text-2xl font-bold sm:text-3xl">
              Before & After Mitra
            </h3>
            <p className="text-text-secondary mt-1 text-sm">
              See the raw input versus complete campaign transformation
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* BEFORE (YOU GIVE MITRA) */}
            <div className="border-error-200 bg-error-50/20 rounded-3xl border p-6 sm:p-8 lg:col-span-5">
              <span className="bg-error-100 text-error-700 rounded-full px-3 py-1 text-xs font-bold">
                You give Mitra
              </span>
              <h4 className="text-text-primary mt-3 text-xl font-bold">Raw Unorganized Input</h4>

              <div className="mt-6 space-y-3">
                <div className="bg-surface border-error-100 flex items-center gap-3 rounded-2xl border p-3.5 shadow-xs">
                  <span className="text-xl">📷</span>
                  <div className="text-xs">
                    <span className="text-text-primary font-bold">Unedited Phone Photo</span>
                    <p className="text-text-tertiary">Quick food photo taken on mobile</p>
                  </div>
                </div>

                <div className="bg-surface border-error-100 flex items-center gap-3 rounded-2xl border p-3.5 shadow-xs">
                  <span className="text-xl">🏷️</span>
                  <div className="text-xs">
                    <span className="text-text-primary font-bold">Simple Discount Idea</span>
                    <p className="text-text-tertiary">&quot;Flat 20% off weekend orders&quot;</p>
                  </div>
                </div>

                <div className="bg-surface border-error-100 flex items-center gap-3 rounded-2xl border p-3.5 shadow-xs">
                  <span className="text-xl">📍</span>
                  <div className="text-xs">
                    <span className="text-text-primary font-bold">Business Name & Phone</span>
                    <p className="text-text-tertiary">Bawarchi Biryani House • 9876543210</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER ANIMATED TRANSFORM CORE */}
            <div className="flex justify-center py-4 lg:col-span-2 lg:py-0">
              <motion.div
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="from-brand-600 shadow-brand-500/30 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr to-amber-500 text-white shadow-xl"
              >
                <span className="text-xl font-black">M</span>
              </motion.div>
            </div>

            {/* AFTER (YOU GET) */}
            <div className="border-success-200 bg-success-50/20 rounded-3xl border p-6 sm:p-8 lg:col-span-5">
              <span className="bg-success-100 text-success-700 rounded-full px-3 py-1 text-xs font-bold">
                You get from Mitra
              </span>
              <h4 className="text-text-primary mt-3 text-xl font-bold">Complete Marketing Pack</h4>

              <div className="mt-6 space-y-3">
                <div className="bg-surface border-success-100 flex items-center justify-between rounded-2xl border p-3.5 text-xs shadow-xs">
                  <span className="text-text-primary flex items-center gap-2 font-bold">
                    <span className="text-success-600">✓</span> Verified Social Visuals & Reels
                  </span>
                  <span className="text-text-tertiary text-[10px]">Fact-Checked</span>
                </div>

                <div className="bg-surface border-success-100 flex items-center justify-between rounded-2xl border p-3.5 text-xs shadow-xs">
                  <span className="text-text-primary flex items-center gap-2 font-bold">
                    <span className="text-success-600">✓</span> Local Telugu & Hinglish Copy
                  </span>
                  <span className="text-text-tertiary text-[10px]">Localised</span>
                </div>

                <div className="bg-surface border-success-100 flex items-center justify-between rounded-2xl border p-3.5 text-xs shadow-xs">
                  <span className="text-text-primary flex items-center gap-2 font-bold">
                    <span className="text-success-600">✓</span> WhatsApp Message Ready to Share
                  </span>
                  <span className="text-text-tertiary text-[10px]">Direct Reach</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
