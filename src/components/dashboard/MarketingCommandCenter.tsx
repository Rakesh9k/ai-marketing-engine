'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Mascot } from '@/components/mascot/Mascot';
import { MagneticWrap } from '@/components/motion/MagneticWrap';
import type { Business } from '@/types';

interface MarketingCommandCenterProps {
  business: Business | null;
  greeting?: string;
  recommendationTitle?: string;
  recommendationSubtitle?: string;
}

export function MarketingCommandCenter({
  business,
  greeting,
  recommendationTitle: _recommendationTitle,
  recommendationSubtitle,
}: MarketingCommandCenterProps) {
  const reduceMotion = useReducedMotion();
  const businessName = business?.name || 'your business';

  const defaultGreeting = `Good morning, ${businessName}!`;
  const defaultTitle = 'What are we marketing today?';
  const defaultSub =
    'Turn your latest offer, dish, or event into complete posts, reels, and WhatsApp campaigns.';

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-orange-200/50 bg-gradient-to-r from-[#FFF5F0] via-[#FFFDF9] to-[#FEF3EB] p-6 shadow-sm sm:p-8"
    >
      {/* Background Decorative Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(#E84D1A 0.75px, transparent 0.75px)`,
          backgroundSize: '20px 20px',
        }}
      />
      <div className="bg-brand-500/10 pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Left Column: Mascot + Handwritten Tag + Headline */}
        <div className="flex flex-col items-start lg:col-span-7">
          {/* Handwritten Cursive Tag */}
          <div className="mb-1 inline-flex items-center gap-1.5 font-serif text-sm font-medium text-[#E84D1A] italic sm:text-base">
            <span>✨ Big ideas for {businessName}!</span>
          </div>

          <h1 className="text-2xl leading-tight font-bold tracking-tight text-[#1A1A1E] sm:text-3xl lg:text-4xl">
            {greeting || defaultGreeting}
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#5C5C66] sm:text-base">
            {recommendationSubtitle || `${defaultTitle} ${defaultSub}`}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <MagneticWrap strength={8}>
              <Link
                href="/campaigns/new"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E84D1A] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-[#d04113]"
              >
                <span>Create New Campaign →</span>
              </Link>
            </MagneticWrap>

            <Link href="/business">
              <div className="border-border-medium inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white/80 px-4 py-3 text-sm font-medium text-[#1A1A1E] backdrop-blur transition-all hover:bg-white">
                <span>🧠 Business Brain</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: 3D Mascot Image + Floating Creative Preview Cards */}
        <div className="relative flex min-h-[220px] items-center justify-center lg:col-span-5">
          {/* Handwritten Right Callout */}
          <div className="absolute -top-2 right-2 hidden sm:block">
            <span className="rounded-full border border-orange-100 bg-white/90 px-2.5 py-1 font-serif text-xs text-[#E84D1A] italic shadow-2xs">
              Great marketing made effortless!
            </span>
          </div>

          {/* Floating Card Preview Stack */}
          <div className="relative flex w-full max-w-xs items-center justify-center">
            {/* Mascot Image */}
            <Mascot state="waving" size="xl" glow shadow animated priority />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
