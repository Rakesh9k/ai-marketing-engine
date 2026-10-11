'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

/**
 * Deliberately says nothing about a first campaign. Whether the owner's plan can generate one is a
 * separate matter (credits), and onboarding must never promise something the plan cannot deliver.
 * It points at things that are always true: the dashboard, and what Mitra now knows.
 */
export function CompletionScreen({ name }: { name?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center space-y-6 text-center"
    >
      <MitraMascot pose="success" size="xl" alt="" animated={!reduceMotion} priority />
      <div className="space-y-3">
        <h1 className="text-text-primary text-4xl font-black tracking-tight sm:text-5xl">
          Mitra knows your business now{name ? `, ${name}` : ''}.
        </h1>
        <p className="text-text-secondary mx-auto max-w-md text-lg leading-relaxed">
          From here on, I&apos;ll use what you&apos;ve told me whenever I create marketing for you.
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
        <Link
          href="/dashboard"
          className="bg-brand-500 hover:bg-brand-600 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-10 font-bold text-white sm:w-auto"
        >
          Go to my dashboard
        </Link>
        <Link
          href="/business"
          className="text-brand-600 inline-flex min-h-[44px] items-center px-2 text-sm font-semibold hover:underline"
        >
          See what Mitra knows
        </Link>
      </div>
    </motion.div>
  );
}
