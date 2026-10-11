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
    <section
      id="philosophy"
      className="bg-surface border-border-light relative overflow-hidden border-t py-20"
    >
      <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        {/* Main Banner Headline */}
        <div className="border-brand-200 from-brand-50 via-surface rounded-3xl border bg-gradient-to-r to-amber-50/50 p-8 shadow-lg sm:p-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <span className="text-brand-700 bg-brand-100 rounded-full px-3 py-1 text-xs font-extrabold tracking-wider uppercase">
                What We Believe
              </span>
              <h2 className="text-text-primary text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-5xl">
                “We don’t think AI should replace your business brain.{' '}
                <span className="text-brand-600">We think it should amplify it.”</span>
              </h2>
              <p className="text-text-secondary text-base leading-relaxed">
                Mitra doesn't try to invent a fake identity for your business. It learns who you are
                and helps you speak to your customers with authentic impact.
              </p>
            </div>

            <div className="flex shrink-0 justify-center lg:col-span-4">
              <MitraMascot pose="explain" size={180} />
            </div>
          </div>
        </div>

        {/* 5 Product Principles */}
        <div className="space-y-6">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <h3 className="text-text-primary text-2xl font-bold">Our 5 Core Product Principles</h3>
            <p className="text-text-secondary text-xs">How we design every feature inside Mitra</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="border-border-light bg-bg-secondary hover:border-brand-300 flex flex-col justify-between rounded-2xl border p-6 shadow-2xs transition-colors"
              >
                <div className="space-y-3">
                  <span className="text-brand-600 bg-brand-100/70 rounded-md px-2.5 py-1 text-xs font-black">
                    {p.num}
                  </span>
                  <h4 className="text-text-primary text-base font-bold">{p.title}</h4>
                  <p className="text-text-secondary text-xs leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Core Values Section */}
        <div className="border-border-light space-y-6 border-t pt-6">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <span className="text-brand-700 bg-brand-50 rounded-full px-3 py-1 text-xs font-bold">
              Our Values
            </span>
            <h3 className="text-text-primary text-2xl font-bold">What Drives Us Every Day</h3>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_VALUES.map((val, idx) => (
              <div
                key={idx}
                className="border-border-light bg-surface flex flex-col items-start space-y-3 rounded-2xl border p-6 shadow-2xs"
              >
                <div className="bg-brand-50 border-brand-100 flex h-10 w-10 items-center justify-center rounded-xl border text-xl">
                  {val.icon}
                </div>
                <h4 className="text-text-primary text-sm font-bold">{val.title}</h4>
                <p className="text-text-tertiary text-xs leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
