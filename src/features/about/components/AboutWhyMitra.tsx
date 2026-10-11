'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutWhyMitra() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-primary border-border-light relative overflow-hidden border-t py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-brand-200/80 from-surface via-brand-50/20 to-surface mx-auto max-w-5xl space-y-8 rounded-3xl border bg-gradient-to-b p-8 text-center shadow-xl sm:p-14">
          <div className="border-brand-200 bg-brand-100/60 text-brand-800 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold">
            <span>🤝</span>
            <span>Why "Mitra"?</span>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="flex items-center justify-center gap-4">
              <MitraMascot pose="idea" size={100} />
              <h2 className="text-text-primary text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
                MITRA
              </h2>
            </div>
            <p className="text-brand-600 text-sm font-bold tracking-widest uppercase">
              Friend • Partner • Companion • Copilot
            </p>
          </motion.div>

          <p className="text-text-secondary mx-auto max-w-3xl text-lg leading-relaxed font-medium sm:text-xl">
            “Mitra isn’t meant to feel like complex software you operate. It’s meant to feel like an
            intelligent, friendly marketing partner sitting right beside you.”
          </p>

          <div className="text-text-secondary mx-auto grid max-w-2xl grid-cols-1 gap-4 pt-4 text-xs font-semibold sm:grid-cols-3">
            <div className="border-border-light bg-surface rounded-2xl border p-4 shadow-2xs">
              <span className="mb-1 block text-base">🤝</span>
              <span>A true partner, not another SaaS tool</span>
            </div>
            <div className="border-border-light bg-surface rounded-2xl border p-4 shadow-2xs">
              <span className="mb-1 block text-base">👂</span>
              <span>Listens &amp; remembers your business</span>
            </div>
            <div className="border-border-light bg-surface rounded-2xl border p-4 shadow-2xs">
              <span className="mb-1 block text-base">⚡</span>
              <span>Executes campaigns in seconds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
