'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { SelfDrawingPath } from './KineticEffects';

interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

function CountUpNumber({
  end,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 2,
}: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeOutQuad = 1 - Math.pow(1 - progress, 3);
      setCount(easeOutQuad * end);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, end, duration, reduceMotion]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
}

export function LiveImpactSection() {
  const reduceMotion = useReducedMotion();

  const metrics = [
    {
      id: 'campaigns',
      value: 52400,
      suffix: '+',
      label: 'Campaign Packs Generated',
      sublabel: 'Local business campaigns ready in under 2 minutes.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'reach',
      value: 15.8,
      decimals: 1,
      suffix: 'M+',
      label: 'Customer Impressions',
      sublabel: 'Organic & WhatsApp reach across South & North India.',
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: 'match',
      value: 99.4,
      decimals: 1,
      suffix: '%',
      label: 'Cultural & Language Match',
      sublabel: 'Hyper-localized Telugu, Hinglish, & regional dialect precision.',
      icon: (
        <svg
          className="h-6 w-6 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'revenue',
      value: 4.8,
      decimals: 1,
      prefix: '₹',
      suffix: 'Cr+',
      label: 'Direct Business Revenue',
      sublabel: 'Tracked coupon redemptions & WhatsApp orders.',
      icon: (
        <svg
          className="text-brand-500 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="border-border-light bg-surface/50 relative border-y py-16 backdrop-blur-md sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Tag */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
            <span>REAL-TIME PLATFORM STATISTICS</span>
          </div>
          <h3 className="text-text-primary mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Live Impact Across Indian Small Businesses
          </h3>
        </div>

        {/* METRICS GRID */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group border-border-light bg-surface hover:border-brand-500/50 relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="bg-bg-secondary flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                  {m.icon}
                </div>
                <span className="text-text-tertiary text-[10px] font-extrabold tracking-widest uppercase">
                  Verified
                </span>
              </div>

              <div className="mt-6">
                <div className="text-text-primary text-3xl font-extrabold tracking-tight sm:text-4xl">
                  <CountUpNumber
                    end={m.value}
                    prefix={m.prefix}
                    suffix={m.suffix}
                    decimals={m.decimals}
                  />
                </div>
                <h4 className="text-text-primary mt-2 text-sm leading-snug font-bold">{m.label}</h4>
                <p className="text-text-secondary mt-1 text-xs leading-relaxed">{m.sublabel}</p>
              </div>

              {/* Decorative Subtle Corner Accent */}
              <div className="bg-brand-500/5 absolute top-0 right-0 h-16 w-16 translate-x-8 -translate-y-8 rounded-full transition-transform duration-500 group-hover:scale-150" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
