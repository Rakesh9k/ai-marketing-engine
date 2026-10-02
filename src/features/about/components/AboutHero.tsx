'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/40 via-surface to-bg-primary pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Story Headline & Details */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="space-y-6 lg:col-span-7"
          >
            {/* Category Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/80 px-3.5 py-1 text-xs font-bold text-brand-700 shadow-2xs backdrop-blur-xs">
              <span>🎨</span>
              <span>Our Story</span>
            </div>

            {/* Kinetic Main Headline */}
            <h1 className="text-text-primary font-black tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
              Small Businesses.{' '}
              <span className="block text-brand-600">Big Dreams.</span>
              <span className="relative inline-block text-text-primary">
                That’s Why We’re Here.
                <svg
                  className="absolute -bottom-2 left-0 w-full text-brand-400/40"
                  height="10"
                  viewBox="0 0 200 10"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M1 5C50 2 150 8 199 5"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Editorial Subtitle */}
            <p className="text-text-secondary text-lg sm:text-xl font-normal leading-relaxed max-w-2xl">
              Mitra by Brainwise was born from a simple belief — that every local business, no
              matter how small, deserves the power of great marketing without the complexity.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary shadow-2xs">
                <span className="text-base">🕌</span>
                <span>Built for Indian Businesses</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary shadow-2xs">
                <span className="text-base">🧠</span>
                <span>Powered by AI &amp; Creativity</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary shadow-2xs">
                <span className="text-base">🤝</span>
                <span>Made with Real People</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 hover:shadow-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                Meet Mitra Free →
              </Link>
              <a
                href="#philosophy"
                className="inline-flex items-center justify-center rounded-xl border border-border-medium bg-surface px-6 py-3.5 text-sm font-bold text-text-primary shadow-2xs transition-all hover:bg-bg-secondary hover:border-brand-300"
              >
                See How It Works
              </a>
            </div>
          </motion.div>

          {/* Right Column: Visual Mascot & Floating Badge */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="relative flex items-center justify-center lg:col-span-5"
          >
            {/* Soft decorative background panel */}
            <div className="relative w-full max-w-md rounded-3xl border border-brand-200/60 bg-gradient-to-tr from-brand-100/40 via-surface to-amber-50/50 p-6 shadow-xl sm:p-8">
              {/* Floating Note Badge */}
              <motion.div
                animate={reduceMotion ? {} : { y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-5 -right-4 z-20 max-w-[210px] rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900 shadow-md rotate-2"
              >
                <p className="font-handwriting text-sm leading-snug">
                  Better marketing. More customers. A stronger local economy. 😊
                </p>
              </motion.div>

              {/* Hand-drawn greeting */}
              <div className="absolute top-6 left-6 z-20 flex items-center gap-1">
                <span className="font-serif italic text-brand-700 text-sm font-bold">
                  Hello! I’m Mitra! 👋
                </span>
              </div>

              {/* Central Mascot Pose */}
              <div className="relative z-10 flex items-center justify-center pt-8">
                <MitraMascot pose="idle" size={280} alt="Mitra AI Mascot" className="drop-shadow-xl" />
              </div>

              {/* Bottom Tagline */}
              <div className="mt-4 border-t border-brand-200/60 pt-3 text-center">
                <p className="text-xs font-semibold text-text-tertiary">
                  AI marketing, with a little more human understanding.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
