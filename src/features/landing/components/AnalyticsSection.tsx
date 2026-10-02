'use client';

import { motion, useReducedMotion } from 'motion/react';

export function AnalyticsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-bg-primary py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* TEXT CONTENT */}
          <div className="lg:col-span-5">
            <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
              Clear Marketing Intelligence
            </span>
            <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Know what works. Repeat what wins.
            </h2>
            <p className="text-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
              Mitra gives you clear visual analytics for every campaign. See views, clicks, and real
              customer orders without getting overwhelmed by vanity metrics.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  ✓
                </div>
                <div>
                  <h4 className="text-text-primary text-sm font-bold">Real Conversion Tracking</h4>
                  <p className="text-text-secondary text-xs">
                    Track WhatsApp orders and coupon redemptions directly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  ✓
                </div>
                <div>
                  <h4 className="text-text-primary text-sm font-bold">Actionable Suggestions</h4>
                  <p className="text-text-secondary text-xs">
                    Mitra highlights your best-performing offers and recommends next steps.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ANIMATED ANALYTICS CHART CARD */}
          <div className="lg:col-span-7">
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="border-border-light bg-surface rounded-3xl border p-6 shadow-xl sm:p-8"
            >
              <div className="border-border-light flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div>
                  <span className="text-brand-600 text-xs font-bold tracking-wider uppercase">
                    Illustrative Campaign Metrics
                  </span>
                  <h3 className="text-text-primary mt-0.5 text-xl font-bold">
                    Hyderabadi Biryani Weekend Promo
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  +34% Engagement
                </span>
              </div>

              {/* STATS COUNTER GRID */}
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="bg-bg-secondary rounded-2xl p-4">
                  <span className="text-text-primary block text-2xl font-extrabold sm:text-3xl">
                    2.4K
                  </span>
                  <span className="text-text-secondary text-xs font-medium">Total Views</span>
                </div>
                <div className="bg-bg-secondary rounded-2xl p-4">
                  <span className="text-text-primary block text-2xl font-extrabold sm:text-3xl">
                    892
                  </span>
                  <span className="text-text-secondary text-xs font-medium">Link Clicks</span>
                </div>
                <div className="bg-brand-50 border-brand-100 rounded-2xl border p-4">
                  <span className="text-brand-600 block text-2xl font-extrabold sm:text-3xl">
                    123
                  </span>
                  <span className="text-brand-700 text-xs font-semibold">Orders Placed</span>
                </div>
              </div>

              {/* ANIMATED SVG PERFORMANCE LINE CHART */}
              <div className="relative mt-8 h-48 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 500 160">
                  <defs>
                    <linearGradient id="analyticsChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E84D1A" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#E84D1A" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#e9e2d8" strokeDasharray="4 4" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#e9e2d8" strokeDasharray="4 4" />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="#e9e2d8" strokeDasharray="4 4" />

                  {/* Filled area under path */}
                  <path
                    d="M 0 130 Q 100 90, 200 110 T 380 40 T 500 20 L 500 160 L 0 160 Z"
                    fill="url(#analyticsChartGrad)"
                  />

                  {/* Animated stroke line */}
                  <motion.path
                    d="M 0 130 Q 100 90, 200 110 T 380 40 T 500 20"
                    fill="none"
                    stroke="#E84D1A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />

                  {/* Target data points */}
                  <circle cx="200" cy="110" r="5" fill="#E84D1A" className="shadow-md" />
                  <circle cx="380" cy="40" r="5" fill="#E84D1A" />
                  <circle cx="500" cy="20" r="6" fill="#E84D1A" />
                </svg>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
