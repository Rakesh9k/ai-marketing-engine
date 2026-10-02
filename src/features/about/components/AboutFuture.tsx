'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

const ROADMAP_STEPS = [
  {
    phase: 'Today',
    title: 'Instant Campaign & Creative Creation',
    desc: 'Turn business facts & photos into captions, posters, WhatsApp copy, and video scripts in seconds.',
    status: 'Live & Active',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    phase: 'Tomorrow',
    title: 'Deeper Business & Inventory Integration',
    desc: 'Mitra learns seasonal trends, underperforming menu items, and peak customer booking hours.',
    status: 'In Development',
    badgeClass: 'bg-brand-100 text-brand-800',
  },
  {
    phase: 'The Vision',
    title: 'Autonomous Marketing Copilot',
    desc: 'A partner that proactively recommends campaigns, schedules posts, analyzes performance, and drives footfall.',
    status: 'Long-term Goal',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
];

export function AboutFuture() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-secondary py-20 relative overflow-hidden border-t border-border-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-800">
            <span>🔮</span>
            <span>Where We're Going</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
            Marketing should eventually feel like something you <span className="text-brand-600">do with Mitra.</span>
          </h2>

          <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
            We are building an intelligent marketing partner that becomes increasingly useful as it understands your business.
          </p>
        </div>

        {/* Roadmap Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROADMAP_STEPS.map((s, idx) => (
            <motion.div
              key={idx}
              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
              className="flex flex-col justify-between rounded-3xl border border-border-light bg-surface p-6 shadow-xs space-y-4 hover:border-brand-400 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-brand-600">{s.phase}</span>
                  <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${s.badgeClass}`}>
                    {s.status}
                  </span>
                </div>
                <h3 className="font-bold text-base text-text-primary">{s.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing Vision Note */}
        <div className="flex items-center justify-center gap-3 pt-4 text-center">
          <MitraMascot pose="discovering" size={48} />
          <p className="text-xs font-bold text-text-tertiary">
            Real businesses before generic demos. Action before dashboards.
          </p>
        </div>
      </div>
    </section>
  );
}
