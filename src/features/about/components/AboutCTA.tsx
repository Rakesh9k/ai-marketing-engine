'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutCTA() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-surface py-20 relative overflow-hidden border-t border-border-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-brand-300 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 p-8 sm:p-14 text-white shadow-2xl">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Mascot & Speech Note */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 lg:col-span-5 text-center sm:text-left">
              <MitraMascot pose="cheer" size={160} className="drop-shadow-lg shrink-0" />
              <div className="space-y-1">
                <span className="font-handwriting text-brand-300 text-sm font-bold block rotate-1">
                  “Let’s build the future of local business together!” 👋
                </span>
                <p className="text-[11px] text-neutral-400 font-medium">
                  Real Businesses. Real Stories. With Mitra. ❤️
                </p>
              </div>
            </div>

            {/* Right Column: CTA Content & Buttons */}
            <div className="space-y-6 lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3.5 py-1 text-xs font-bold text-brand-300">
                <span>✨ Join the Movement</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Be Part of the <span className="text-brand-400">Next Chapter</span>
              </h2>

              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Whether you’re a restaurant owner, salon founder, realtor, or local entrepreneur — give Mitra a little context about your business and see what happens.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-brand-500 px-8 py-4 text-sm font-extrabold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-400 hover:scale-105 focus:ring-2 focus:ring-brand-400 focus:outline-none"
                >
                  Get Started Free →
                </Link>
                <span className="text-xs text-neutral-400 font-medium">No credit card required.</span>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-center lg:text-left">
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-brand-400">1000+</h4>
                  <p className="text-[11px] text-neutral-400 font-semibold">Businesses Onboarded</p>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-brand-400">50+</h4>
                  <p className="text-[11px] text-neutral-400 font-semibold">Cities &amp; Towns</p>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-brand-400">10+</h4>
                  <p className="text-[11px] text-neutral-400 font-semibold">Languages Supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
