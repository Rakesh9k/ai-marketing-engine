'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutOrigin() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-primary py-20 relative overflow-hidden border-t border-border-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
          {/* Left Column: Story Content */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700">
              <span>🚀</span>
              <span>Where It All Started</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
              The <span className="text-brand-600">Brainwise Story</span>
            </h2>

            <div className="space-y-4 text-text-secondary text-sm sm:text-base leading-relaxed">
              <p>
                Brainwise started with a different kind of question:{' '}
                <strong className="text-text-primary font-bold">
                  What if AI could actually understand people — not just process data?
                </strong>
              </p>

              <p>
                We began with <strong className="text-brand-700">Enso</strong> — a voice-first AI self-awareness companion, helping people understand themselves better. That journey taught us something powerful: AI is most valuable when it feels personal, human, and deeply relevant to real life.
              </p>

              <p>
                That same belief is what led to <strong className="text-brand-600">Mitra</strong> — our next chapter, built for the hardworking business owners who keep our cities alive: local restaurants, salons, retailers, realtors, and service providers.
              </p>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 font-handwriting text-brand-700 text-sm font-bold bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                <span>✨ From self-awareness... to empowering local businesses!</span>
              </span>
            </div>
          </div>

          {/* Right Column: Visual Evolution Card (Enso -> Mitra) */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative lg:col-span-6"
          >
            <div className="rounded-3xl border border-border-light bg-surface p-6 sm:p-8 shadow-xl space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Enso Card */}
                <div className="rounded-2xl border border-neutral-200 bg-neutral-900 p-5 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400">Chapter 1</span>
                    <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                      2023
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white">Enso</h3>
                  <p className="text-xs text-neutral-300 font-medium">
                    "You, understood." — Voice-first AI self-awareness companion.
                  </p>
                </div>

                {/* Transition Arrow */}
                <div className="hidden sm:flex flex-col items-center justify-center text-brand-500 font-bold text-xs">
                  <span>Evolution →</span>
                </div>

                {/* Mitra Card */}
                <div className="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-surface p-5 text-text-primary space-y-3 shadow-md sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MitraMascot pose="idea" size={32} />
                      <span className="font-extrabold text-brand-700 text-sm">Mitra by Brainwise</span>
                    </div>
                    <span className="rounded-full bg-brand-500 text-white px-2.5 py-0.5 text-[10px] font-bold">
                      Present &amp; Future
                    </span>
                  </div>
                  <p className="text-xs font-bold text-text-primary">
                    The AI Marketing Partner built specifically for Indian local businesses.
                  </p>
                </div>
              </div>

              {/* Photo Chips */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px] font-bold text-text-secondary">
                <div className="rounded-xl border border-border-light bg-bg-secondary p-2">
                  🍛 Hyderabadi Cafes
                </div>
                <div className="rounded-xl border border-border-light bg-bg-secondary p-2">
                  💇‍♀️ Beauty &amp; Salons
                </div>
                <div className="rounded-xl border border-border-light bg-bg-secondary p-2">
                  🏠 Real Estate
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
