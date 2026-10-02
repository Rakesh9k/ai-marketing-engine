'use client';

import { motion, useReducedMotion } from 'motion/react';

const TIMELINE_STEPS = [
  {
    year: '2023',
    icon: '🧠',
    title: 'Brainwise Begins',
    description: 'We started with Enso — our voice-first AI companion focused on human understanding.',
  },
  {
    year: '2024',
    icon: '💡',
    title: 'The Vision Expands',
    description: 'We saw the exact same opportunity in local businesses — and Mitra was born.',
  },
  {
    year: '2025',
    icon: '🚀',
    title: 'Mitra Launches',
    description: 'Built for Indian businesses with local language, culture, and real-world workflows.',
  },
  {
    year: 'Today',
    icon: '🌟',
    title: 'Growing Together',
    description: 'Thousands of businesses. Countless campaigns. One unified mission.',
  },
];

export function AboutJourney() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-secondary py-20 border-t border-border-light relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700">
            <span>🚩</span>
            <span>Our Journey</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
            From a simple idea to a <span className="text-brand-600">growing mission</span>
          </h2>

          <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
            What started as a vision is now a platform helping thousands of local businesses create, share, and grow with the power of AI.
          </p>
        </div>

        {/* Horizontal / Grid Timeline */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIMELINE_STEPS.map((step, idx) => (
            <motion.div
              key={idx}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
              className="relative flex flex-col justify-between rounded-3xl border border-border-light bg-surface p-6 shadow-xs hover:border-brand-400 hover:shadow-md transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="rounded-full bg-brand-100 text-brand-700 px-3 py-1 text-xs font-extrabold">
                    {step.year}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-text-primary">{step.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{step.description}</p>
              </div>

              {idx < TIMELINE_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-brand-300 font-bold text-lg z-10">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
