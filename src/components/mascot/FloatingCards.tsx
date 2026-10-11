'use client';

import React, { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SparkIllustration } from '../illustrations/Illustrations';

interface FloatingCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  glow?: boolean;
}

export function FloatingCard({
  children,
  delay = 0,
  className = '',
  glow = false,
}: FloatingCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 24,
        delay: reduceMotion ? 0 : delay,
      }}
      className={`relative rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-xl shadow-neutral-900/5 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:shadow-black/40 ${
        glow ? 'ring-2 ring-[#E84D1A]/30 dark:ring-[#E84D1A]/40' : ''
      } ${className}`.trim()}
    >
      {glow && (
        <div className="pointer-events-none absolute -inset-0.5 -z-10 rounded-2xl bg-gradient-to-br from-[#E84D1A]/20 to-transparent blur-md" />
      )}
      {children}
    </motion.div>
  );
}

export function CampaignCard({
  title = 'Festive Biryani Launch',
  status = 'Ready to Publish',
  reach = '12.4k Est. Reach',
  delay = 0.1,
  className = '',
}: {
  title?: string;
  status?: string;
  reach?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <FloatingCard delay={delay} className={`w-64 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E84D1A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#E84D1A]">
          <SparkIllustration size={12} />
          Campaign
        </span>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{status}</span>
      </div>
      <h4 className="mt-2.5 line-clamp-1 text-sm font-bold text-neutral-900 dark:text-white">
        {title}
      </h4>
      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800/60 dark:text-neutral-400">
        <span>{reach}</span>
        <span className="font-semibold text-[#E84D1A]">Mitra AI</span>
      </div>
    </FloatingCard>
  );
}

export function InsightCard({
  metric = '+42% Engagement',
  label = 'Weekend Post Velocity',
  delay = 0.2,
  className = '',
}: {
  metric?: string;
  label?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <FloatingCard delay={delay} className={`w-56 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E84D1A]/10 text-[#E84D1A]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">{metric}</p>
        </div>
      </div>
    </FloatingCard>
  );
}

export function SocialPostCard({
  platform = 'Instagram Story',
  time = 'Just now',
  caption = 'Savor the authentic spices this Friday! Limited slots open. 🌶️',
  delay = 0.3,
  className = '',
}: {
  platform?: string;
  time?: string;
  caption?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <FloatingCard delay={delay} className={`w-72 ${className}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{platform}</span>
        <span>{time}</span>
      </div>
      <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800/60">
        <p className="line-clamp-2 text-xs leading-snug text-neutral-800 dark:text-neutral-200">
          {caption}
        </p>
      </div>
    </FloatingCard>
  );
}
