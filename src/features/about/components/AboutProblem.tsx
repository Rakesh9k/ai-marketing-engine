'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

const BUSINESS_PROBLEMS = [
  {
    icon: '🍽️',
    title: 'Restaurant & Food Business',
    ownerThought:
      'Thinking about recipes, inventory, rush hour, kitchen staff, and food quality...',
    marketingPain:
      'Then at 9 PM: "Oh wait, I need to post today’s special offer on Instagram & WhatsApp!"',
    badge: 'Hyderabadi Biryani & Cafes',
  },
  {
    icon: '💇‍♀️',
    title: 'Salon & Beauty Studio',
    ownerThought: 'Managing bookings, client walk-ins, service quality, and staff schedules...',
    marketingPain:
      'Then before closing: "How do I showcase this hair makeover transform post to new clients?"',
    badge: 'Beauty & Skincare',
  },
  {
    icon: '🏠',
    title: 'Real Estate & Properties',
    ownerThought: 'Navigating site visits, property listings, documentation, and client calls...',
    marketingPain:
      'Then on Sunday: "I need high-converting ad copy for our new gated apartment weekend visit!"',
    badge: 'Realtors & Builders',
  },
];

export function AboutProblem() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-secondary border-border-light relative overflow-hidden border-y py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-bold text-red-700">
            <span>⚡</span>
            <span>The Reality</span>
          </div>

          <h2 className="text-text-primary text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Running a business is already a <span className="text-brand-600">full-time job.</span>
          </h2>

          <p className="text-text-secondary text-base leading-relaxed sm:text-lg">
            You opened your business to create great products, serve real people, and build your
            dream — not to spend hours wrestling with marketing software.
          </p>
        </div>

        {/* Ticker / Pain Points Marquee */}
        <div className="bg-brand-50/50 border-brand-100 my-10 overflow-hidden rounded-2xl border py-3">
          <div className="animate-marquee text-brand-800 flex space-x-8 text-sm font-extrabold whitespace-nowrap">
            <span>• One more post to write</span>
            <span>• One more reel to record</span>
            <span>• One more offer to design</span>
            <span>• One more caption to figure out</span>
            <span>• One more platform algorithm to keep up with</span>
            <span>• One more post to write</span>
            <span>• One more reel to record</span>
            <span>• One more offer to design</span>
          </div>
        </div>

        {/* 3 Business Context Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {BUSINESS_PROBLEMS.map((b, idx) => (
            <motion.div
              key={idx}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
              className="border-border-light bg-surface hover:border-brand-300 flex flex-col justify-between rounded-3xl border p-6 shadow-xs transition-all hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{b.icon}</span>
                  <span className="bg-bg-secondary text-text-tertiary rounded-md px-2.5 py-1 text-[11px] font-bold">
                    {b.badge}
                  </span>
                </div>

                <h3 className="text-text-primary text-lg font-bold">{b.title}</h3>

                <div className="bg-bg-secondary text-text-secondary border-border-light space-y-2 rounded-2xl border p-4 text-xs">
                  <p className="text-text-primary font-semibold">🧠 Day-to-Day Operations:</p>
                  <p className="italic">“{b.ownerThought}”</p>
                </div>

                <div className="space-y-2 rounded-2xl border border-red-100 bg-red-50/60 p-4 text-xs text-red-900">
                  <p className="font-semibold text-red-700">⌛ Marketing Pressure:</p>
                  <p className="italic">“{b.marketingPain}”</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empathetic Bottom Note */}
        <div className="border-brand-200 bg-surface mx-auto mt-12 flex max-w-4xl flex-col items-center justify-center gap-4 rounded-3xl border p-6 text-center shadow-xs sm:flex-row sm:text-left">
          <MitraMascot pose="concerned" size={80} className="shrink-0" />
          <div className="space-y-1">
            <h4 className="text-text-primary text-base font-bold">
              You shouldn't have to become a full-time marketer to grow your business.
            </h4>
            <p className="text-text-secondary text-xs leading-relaxed">
              That’s the exact reason why Mitra exists: to take marketing off your plate so you can
              focus on your business.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
