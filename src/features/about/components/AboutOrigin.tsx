'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutOrigin() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-primary border-border-light relative overflow-hidden border-t py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Story Content */}
          <div className="space-y-6 lg:col-span-6">
            <div className="border-brand-200 bg-brand-50 text-brand-700 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold">
              <span>🚀</span>
              <span>Where It All Started</span>
            </div>

            <h2 className="text-text-primary text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              The <span className="text-brand-600">Brainwise Story</span>
            </h2>

            <div className="text-text-secondary space-y-4 text-sm leading-relaxed sm:text-base">
              <p>
                Brainwise started with a different kind of question:{' '}
                <strong className="text-text-primary font-bold">
                  What if AI could actually understand people — not just process data?
                </strong>
              </p>

              <p>
                We began with <strong className="text-brand-700">Enso</strong> — a voice-first AI
                self-awareness companion, helping people understand themselves better. That journey
                taught us something powerful: AI is most valuable when it feels personal, human, and
                deeply relevant to real life.
              </p>

              <p>
                That same belief is what led to <strong className="text-brand-600">Mitra</strong> —
                our next chapter, built for the hardworking business owners who keep our cities
                alive: local restaurants, salons, retailers, realtors, and service providers.
              </p>
            </div>

            <div className="pt-2">
              <span className="font-handwriting text-brand-700 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold">
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
            <div className="border-border-light bg-surface space-y-6 rounded-3xl border p-6 shadow-xl sm:p-8">
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                {/* Enso Card */}
                <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-900 p-5 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400">Chapter 1</span>
                    <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      2023
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white">Enso</h3>
                  <p className="text-xs font-medium text-neutral-300">
                    "You, understood." — Voice-first AI self-awareness companion.
                  </p>
                </div>

                {/* Transition Arrow */}
                <div className="text-brand-500 hidden flex-col items-center justify-center text-xs font-bold sm:flex">
                  <span>Evolution →</span>
                </div>

                {/* Mitra Card */}
                <div className="border-brand-200 from-brand-50 to-surface text-text-primary space-y-3 rounded-2xl border bg-gradient-to-b p-5 shadow-md sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MitraMascot pose="idea" size={32} />
                      <span className="text-brand-700 text-sm font-extrabold">
                        Mitra by Brainwise
                      </span>
                    </div>
                    <span className="bg-brand-500 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white">
                      Present &amp; Future
                    </span>
                  </div>
                  <p className="text-text-primary text-xs font-bold">
                    The AI Marketing Partner built specifically for Indian local businesses.
                  </p>
                </div>
              </div>

              {/* Photo Chips */}
              <div className="text-text-secondary grid grid-cols-3 gap-2 pt-2 text-center text-[10px] font-bold">
                <div className="border-border-light bg-bg-secondary rounded-xl border p-2">
                  🍛 Hyderabadi Cafes
                </div>
                <div className="border-border-light bg-bg-secondary rounded-xl border p-2">
                  💇‍♀️ Beauty &amp; Salons
                </div>
                <div className="border-border-light bg-bg-secondary rounded-xl border p-2">
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
