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
    <section className="bg-surface relative overflow-hidden py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <span>💡</span>
            <span>The Insight</span>
          </div>

          <h2 className="text-text-primary text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Your business <span className="text-brand-600">already knows</span> what to say.
          </h2>

          <p className="text-text-secondary text-base leading-relaxed sm:text-lg">
            You know what customers love. You know what makes you special. You know which offers
            work. The problem isn’t lack of knowledge — it’s turning that knowledge into
            ready-to-publish marketing.
          </p>
        </div>

        {/* Visual Flow Pipeline */}
        <div className="border-brand-200/80 from-brand-50/30 to-surface relative mt-14 rounded-3xl border bg-gradient-to-b p-6 shadow-lg sm:p-10">
          <div className="mb-8 text-center">
            <span className="text-brand-700 bg-brand-100/80 rounded-full px-3 py-1 text-xs font-extrabold tracking-wider uppercase">
              How Business Brain Powers Mitra
            </span>
          </div>

          {/* Grid of Knowledge Inputs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {KNOWLEDGE_NODES.map((node, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="border-border-light bg-surface hover:border-brand-400 flex flex-col items-center rounded-2xl border p-4 text-center shadow-2xs transition-colors"
              >
                <span className="mb-2 text-3xl">{node.icon}</span>
                <h3 className="text-text-primary text-xs font-bold">{node.label}</h3>
                <p className="text-text-tertiary mt-1 text-[10px] font-medium">{node.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Connected Flow Arrow to Mitra */}
          <div className="my-8 flex items-center justify-center">
            <div className="bg-brand-600 flex animate-pulse items-center gap-3 rounded-full px-6 py-2.5 text-xs font-extrabold text-white shadow-md">
              <span>Knowledge Flows In</span>
              <span>↓</span>
            </div>
          </div>

          {/* Mitra Intelligence Hub Box */}
          <div className="border-brand-300 bg-surface mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 rounded-2xl border p-6 shadow-md sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="bg-brand-100 border-brand-200 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border">
                <MitraMascot pose="idea" size={48} />
              </div>
              <div>
                <h4 className="text-text-primary text-base font-bold">
                  That's where Mitra comes in.
                </h4>
                <p className="text-text-secondary text-xs">
                  Mitra retains your business context and automatically generates Instagram Reels,
                  WhatsApp status offers, Google captions, and poster graphics.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="bg-brand-500 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs">
                Zero Prompting Needed →
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
