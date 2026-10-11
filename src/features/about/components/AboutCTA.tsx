'use client';

import Link from 'next/link';
import { useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutCTA() {
  const _reduceMotion = useReducedMotion();

  return (
    <section className="bg-surface border-border-light relative overflow-hidden border-t py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-brand-300 relative overflow-hidden rounded-3xl border bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 p-8 text-white shadow-2xl sm:p-14">
          {/* Subtle background glow */}
          <div className="bg-brand-500/20 pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full blur-3xl" />

          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Column: Mascot & Speech Note */}
            <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left lg:col-span-5 lg:justify-start">
              <MitraMascot pose="cheer" size={160} className="shrink-0 drop-shadow-lg" />
              <div className="space-y-1">
                <span className="font-handwriting text-brand-300 block rotate-1 text-sm font-bold">
                  “Let’s build the future of local business together!” 👋
                </span>
                <p className="text-[11px] font-medium text-neutral-400">
                  Real Businesses. Real Stories. With Mitra. ❤️
                </p>
              </div>
            </div>

            {/* Right Column: CTA Content & Buttons */}
            <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
              <div className="text-brand-300 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold">
                <span>✨ Join the Movement</span>
              </div>

              <h2 className="text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Be Part of the <span className="text-brand-400">Next Chapter</span>
              </h2>

              <p className="max-w-xl text-sm leading-relaxed text-neutral-300 sm:text-base">
                Whether you’re a restaurant owner, salon founder, realtor, or local entrepreneur —
                give Mitra a little context about your business and see what happens.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="bg-brand-500 shadow-brand-500/30 hover:bg-brand-400 focus:ring-brand-400 inline-flex w-full items-center justify-center rounded-xl px-8 py-4 text-sm font-extrabold text-white shadow-lg transition-all hover:scale-105 focus:ring-2 focus:outline-none sm:w-auto"
                >
                  Get Started Free →
                </Link>
                <span className="text-xs font-medium text-neutral-400">
                  No credit card required.
                </span>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center lg:text-left">
                <div>
                  <h4 className="text-brand-400 text-xl font-black sm:text-2xl">1000+</h4>
                  <p className="text-[11px] font-semibold text-neutral-400">Businesses Onboarded</p>
                </div>
                <div>
                  <h4 className="text-brand-400 text-xl font-black sm:text-2xl">50+</h4>
                  <p className="text-[11px] font-semibold text-neutral-400">Cities &amp; Towns</p>
                </div>
                <div>
                  <h4 className="text-brand-400 text-xl font-black sm:text-2xl">10+</h4>
                  <p className="text-[11px] font-semibold text-neutral-400">Languages Supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
