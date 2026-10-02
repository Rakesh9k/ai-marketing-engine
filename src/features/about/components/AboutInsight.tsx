'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

const KNOWLEDGE_NODES = [
  { icon: '🏪', label: 'Your Business', desc: 'Name, story & locations' },
  { icon: '🍲', label: 'Your Products', desc: 'Signature items & pricing' },
  { icon: '👥', label: 'Your Audience', desc: 'Local Hyderabad customers' },
  { icon: '🎨', label: 'Your Brand', desc: 'Colors, logo & tone of voice' },
  { icon: '📍', label: 'Local Context', desc: 'Telugu, Hinglish & Festivals' },
  { icon: '🏷️', label: 'Your Offers', desc: 'Discounts & weekend promos' },
];

export function AboutInsight() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-surface py-20 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <span>💡</span>
            <span>The Insight</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
            Your business <span className="text-brand-600">already knows</span> what to say.
          </h2>

          <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
            You know what customers love. You know what makes you special. You know which offers work. The problem isn’t lack of knowledge — it’s turning that knowledge into ready-to-publish marketing.
          </p>
        </div>

        {/* Visual Flow Pipeline */}
        <div className="mt-14 relative rounded-3xl border border-brand-200/80 bg-gradient-to-b from-brand-50/30 to-surface p-6 sm:p-10 shadow-lg">
          <div className="text-center mb-8">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700 bg-brand-100/80 px-3 py-1 rounded-full">
              How Business Brain Powers Mitra
            </span>
          </div>

          {/* Grid of Knowledge Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {KNOWLEDGE_NODES.map((node, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="flex flex-col items-center text-center p-4 rounded-2xl border border-border-light bg-surface shadow-2xs hover:border-brand-400 transition-colors"
              >
                <span className="text-3xl mb-2">{node.icon}</span>
                <h3 className="font-bold text-xs text-text-primary">{node.label}</h3>
                <p className="text-[10px] text-text-tertiary mt-1 font-medium">{node.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Connected Flow Arrow to Mitra */}
          <div className="my-8 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-brand-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-full shadow-md animate-pulse">
              <span>Knowledge Flows In</span>
              <span>↓</span>
            </div>
          </div>

          {/* Mitra Intelligence Hub Box */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-brand-300 bg-surface p-6 shadow-md max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 border border-brand-200 shrink-0">
                <MitraMascot pose="idea" size={48} />
              </div>
              <div>
                <h4 className="font-bold text-base text-text-primary">That's where Mitra comes in.</h4>
                <p className="text-xs text-text-secondary">
                  Mitra retains your business context and automatically generates Instagram Reels, WhatsApp status offers, Google captions, and poster graphics in seconds.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="rounded-xl bg-brand-500 text-white px-4 py-2 text-xs font-bold shadow-xs">
                Zero Prompting Needed →
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
