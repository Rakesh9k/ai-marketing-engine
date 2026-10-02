'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function AboutWhyMitra() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-primary py-20 relative overflow-hidden border-t border-border-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-brand-200/80 bg-gradient-to-b from-surface via-brand-50/20 to-surface p-8 sm:p-14 shadow-xl text-center space-y-8 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-100/60 px-4 py-1.5 text-xs font-bold text-brand-800">
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
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter">
                MITRA
              </h2>
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600">
              Friend • Partner • Companion • Copilot
            </p>
          </motion.div>

          <p className="text-text-secondary text-lg sm:text-xl font-medium leading-relaxed max-w-3xl mx-auto">
            “Mitra isn’t meant to feel like complex software you operate. It’s meant to feel like an intelligent, friendly marketing partner sitting right beside you.”
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-text-secondary pt-4 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs">
              <span className="text-base block mb-1">🤝</span>
              <span>A true partner, not another SaaS tool</span>
            </div>
            <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs">
              <span className="text-base block mb-1">👂</span>
              <span>Listens &amp; remembers your business</span>
            </div>
            <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs">
              <span className="text-base block mb-1">⚡</span>
              <span>Executes campaigns in seconds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
