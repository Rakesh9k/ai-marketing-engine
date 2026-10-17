'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

const ROADMAP_STEPS = [
  {
    phase: 'Today',
    title: 'Instant Campaign & Creative Creation',
    desc: 'Turn business facts & photos into captions, posters, WhatsApp copy, and video scripts.',
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
    <section className="bg-bg-secondary border-border-light relative overflow-hidden border-t py-20">
      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-800">
            <span>🔮</span>
            <span>Where We're Going</span>
          </div>

          <h2 className="text-text-primary text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Marketing should eventually feel like something you{' '}
            <span className="text-brand-600">do with Mitra.</span>
          </h2>

          <p className="text-text-secondary text-base leading-relaxed sm:text-lg">
            We are building an intelligent marketing partner that becomes increasingly useful as it
            understands your business.
          </p>
        </div>

        {/* Roadmap Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ROADMAP_STEPS.map((s, idx) => (
            <motion.div
              key={idx}
              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
              className="border-border-light bg-surface hover:border-brand-400 flex flex-col justify-between space-y-4 rounded-3xl border p-6 shadow-xs transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-brand-600 text-sm font-extrabold">{s.phase}</span>
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${s.badgeClass}`}
                  >
                    {s.status}
                  </span>
                </div>
                <h3 className="text-text-primary text-base font-bold">{s.title}</h3>
                <p className="text-text-secondary text-xs leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing Vision Note */}
        <div className="flex items-center justify-center gap-3 pt-4 text-center">
          <MitraMascot pose="discovering" size={48} />
          <p className="text-text-tertiary text-xs font-bold">
            Real businesses before generic demos. Action before dashboards.
          </p>
        </div>
      </div>
    </section>
  );
}
