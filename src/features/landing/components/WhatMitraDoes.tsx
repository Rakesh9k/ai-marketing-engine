'use client';

import { useRef } from 'react';
import { useAutoRotate } from '@/hooks/useAutoRotate';
import { motion, useReducedMotion } from 'motion/react';
import dynamic from 'next/dynamic';
import type { ScreenId } from './InteractiveDeviceMockup';

const InteractiveDeviceMockup = dynamic(
  () => import('./InteractiveDeviceMockup').then((m) => m.InteractiveDeviceMockup),
  { ssr: false, loading: () => <div className="aspect-[9/16] w-full max-w-[320px]" aria-hidden /> }
);
import { SelfDrawingPath } from './KineticEffects';

const STEP_SCREENS: ScreenId[] = [
  'photo_offer',
  'business_brain',
  'ai_generation',
  'multi_publish',
];

export function WhatMitraDoes() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  // Touch devices have no hover, so the steps advance on their own while visible
  // until the user picks one (or hovers/taps a card).
  const { index: activeStepIndex, select: selectStep } = useAutoRotate({
    count: STEP_SCREENS.length,
    intervalMs: 4500,
    containerRef: sectionRef,
  });
  const activeStepScreen = STEP_SCREENS[activeStepIndex]!;
  const setActiveStepScreen = (screen: ScreenId) => selectStep(STEP_SCREENS.indexOf(screen));

  const steps = [
    {
      num: '01',
      screenId: 'photo_offer' as ScreenId,
      title: 'Tell Mitra about your business',
      desc: 'Upload a product photo, share an offer, or type a simple idea. That’s all Mitra needs to begin.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <SelfDrawingPath d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      detail: 'Photo + Offer + Price',
    },
    {
      num: '02',
      screenId: 'business_brain' as ScreenId,
      title: 'Mitra understands your business',
      desc: 'Business Brain analyzes your brand style, target audience, local language, and best selling angles.',
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      detail: 'Local Language & Tone Match',
    },
    {
      num: '03',
      screenId: 'ai_generation' as ScreenId,
      title: 'Mitra creates the campaign',
      desc: 'Social ad visuals, Instagram Reels scripts, localized captions, and WhatsApp broadcasts generated in seconds.',
      icon: (
        <svg
          className="h-6 w-6 text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      detail: '6+ Campaign Assets Ready',
    },
    {
      num: '04',
      screenId: 'multi_publish' as ScreenId,
      title: 'You share and grow',
      desc: 'Review your campaign, then share it on WhatsApp or download your post and reel to use anywhere.',
      icon: (
        <svg
          className="h-6 w-6 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <SelfDrawingPath d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      detail: '1-Click Multi-Channel Launch',
    },
  ];

  return (
    <section ref={sectionRef} id="how-it-works" className="bg-bg-secondary relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            ⚡ Interactive Step-by-Step Flow
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Your marketing partner, without the agency cost.
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            From one photo to a real campaign in 4 simple steps. Hover or click any step below to
            see the live app screen transform in real-time.
          </p>
        </div>

        {/* 4-Step Cards Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const isActive = activeStepScreen === step.screenId;

            return (
              <motion.div
                key={step.num}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                onMouseEnter={() => setActiveStepScreen(step.screenId)}
                onClick={() => setActiveStepScreen(step.screenId)}
                className={`relative flex cursor-pointer flex-col justify-between rounded-3xl border p-6 shadow-sm transition-all duration-300 ${
                  isActive
                    ? 'border-brand-500 bg-surface ring-brand-500/20 -translate-y-1 shadow-xl ring-2'
                    : 'border-border-light bg-surface/80 hover:border-brand-500/40 hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="bg-bg-secondary flex h-11 w-11 items-center justify-center rounded-2xl">
                      {step.icon}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        isActive ? 'bg-brand-500 text-white' : 'bg-bg-secondary text-text-secondary'
                      }`}
                    >
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-text-primary mt-5 text-lg leading-snug font-bold">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary mt-2 text-xs leading-relaxed">{step.desc}</p>
                </div>

                <div className="border-border-light mt-6 flex items-center justify-between border-t pt-3">
                  <span className="bg-bg-secondary text-text-secondary rounded-md px-2.5 py-1 text-[11px] font-semibold">
                    {step.detail}
                  </span>
                  {isActive && (
                    <span className="text-brand-600 flex animate-pulse items-center gap-1 text-[10px] font-bold">
                      Active Screen
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CENTRAL FLOATING DEVICE MOCKUP */}
        <div className="mt-16">
          <InteractiveDeviceMockup
            activeScreen={activeStepScreen}
            onScreenChange={(screen) => setActiveStepScreen(screen)}
          />
        </div>
      </div>
    </section>
  );
}
