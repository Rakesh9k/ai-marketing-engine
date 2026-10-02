'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

const PRINCIPLES = [
  {
    num: '01',
    title: 'Understand before creating',
    desc: 'Mitra reads your Business Brain, product details, and brand tone before generating a single piece of content.',
  },
  {
    num: '02',
    title: 'Context matters',
    desc: 'A Hyderabad restaurant isn’t marketed the same way as a luxury beauty salon in Mumbai. Local nuances matter.',
  },
  {
    num: '03',
    title: 'AI should reduce work',
    desc: 'The goal isn’t to give you another complicated SaaS dashboard to operate. The goal is to take work off your plate.',
  },
  {
    num: '04',
    title: 'Creativity needs context',
    desc: 'Great marketing isn’t just decorative graphics. It requires the right product, audience, offer, tone, and moment.',
  },
  {
    num: '05',
    title: 'The business stays in control',
    desc: 'Mitra proposes, plans, and drafts. You review, refine, and approve. You are always the boss.',
  },
];

const CORE_VALUES = [
  {
    icon: '🧡',
    title: 'Real Impact',
    desc: 'We build solutions that create measurable footfall & revenue growth for real local businesses.',
  },
  {
    icon: '👥',
    title: 'Human First',
    desc: 'Technology should feel personal, approachable, helpful, and effortless to use.',
  },
  {
    icon: '🍃',
    title: 'Local Roots',
    desc: 'We understand Indian markets, regional languages, cultural festivals, and neighborhood dynamics.',
  },
  {
    icon: '⭐️',
    title: 'Continuous Growth',
    desc: 'We learn from real customer feedback, iterate quickly, and improve our AI every single day.',
  },
];

export function AboutPhilosophy() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="philosophy" className="bg-surface py-20 relative overflow-hidden border-t border-border-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Main Banner Headline */}
        <div className="rounded-3xl border border-brand-200 bg-gradient-to-r from-brand-50 via-surface to-amber-50/50 p-8 sm:p-12 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="space-y-4 lg:col-span-8">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700 bg-brand-100 px-3 py-1 rounded-full">
                What We Believe
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight leading-tight">
                “We don’t think AI should replace your business brain.{' '}
                <span className="text-brand-600">We think it should amplify it.”</span>
              </h2>
              <p className="text-text-secondary text-base leading-relaxed">
                Mitra doesn't try to invent a fake identity for your business. It learns who you are and helps you speak to your customers with authentic impact.
              </p>
            </div>

            <div className="flex justify-center lg:col-span-4 shrink-0">
              <MitraMascot pose="explain" size={180} />
            </div>
          </div>
        </div>

        {/* 5 Product Principles */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl font-bold text-text-primary">Our 5 Core Product Principles</h3>
            <p className="text-xs text-text-secondary">How we design every feature inside Mitra</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRINCIPLES.map((p, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="flex flex-col justify-between rounded-2xl border border-border-light bg-bg-secondary p-6 shadow-2xs hover:border-brand-300 transition-colors"
              >
                <div className="space-y-3">
                  <span className="text-xs font-black text-brand-600 bg-brand-100/70 px-2.5 py-1 rounded-md">
                    {p.num}
                  </span>
                  <h4 className="font-bold text-base text-text-primary">{p.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Core Values Section */}
        <div className="space-y-6 pt-6 border-t border-border-light">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
              Our Values
            </span>
            <h3 className="text-2xl font-bold text-text-primary">What Drives Us Every Day</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_VALUES.map((val, idx) => (
              <div
                key={idx}
                className="flex flex-col items-start rounded-2xl border border-border-light bg-surface p-6 shadow-2xs space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-xl">
                  {val.icon}
                </div>
                <h4 className="font-bold text-sm text-text-primary">{val.title}</h4>
                <p className="text-xs text-text-tertiary leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
