'use client';

import { motion } from 'motion/react';
import { MitraShortLogo } from '@/components/ui/MitraShortLogo';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
  onStepClick?: (step: number) => void;
}

const STEP_LABELS = [
  'Welcome',
  'Business',
  'Location',
  'Contact',
  'Marketing',
  'Style',
  'Review',
  'Ready',
];

export function OnboardingProgress({
  currentStep,
  totalSteps = 8,
  onStepClick,
}: OnboardingProgressProps) {
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <header className="sticky top-3 z-40 mx-auto w-full max-w-6xl px-4 sm:px-6">
      <nav className="flex items-center justify-between rounded-full border border-amber-100/80 bg-white/90 px-5 py-3 shadow-lg shadow-amber-950/5 backdrop-blur-md transition-all">
        {/* Mitra Brand Identifier */}
        <div className="flex items-center gap-2.5">
          <MitraShortLogo size="md" decorative />
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-[#1A1A1E]">Mitra</span>
            <span className="hidden rounded-full border border-orange-200/60 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#E84D1A] sm:inline">
              by Brainwise
            </span>
          </div>
        </div>

        {/* Desktop Stepper Navigation */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="relative flex items-center gap-2">
            {/* Background connecting bar */}
            <div className="absolute top-1/2 right-3 left-3 -z-10 h-0.5 -translate-y-1/2 bg-neutral-100" />

            {/* Active connecting fill bar */}
            <motion.div
              className="absolute top-1/2 left-3 -z-10 h-0.5 -translate-y-1/2 bg-[#E84D1A]"
              initial={false}
              animate={{
                width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
              }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />

            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => {
              const isActive = currentStep === stepNum;
              const isCompleted = currentStep > stepNum;
              const label = STEP_LABELS[stepNum - 1] || `Step ${stepNum}`;

              return (
                <button
                  key={stepNum}
                  type="button"
                  onClick={() => isCompleted && onStepClick?.(stepNum)}
                  disabled={!isCompleted}
                  title={`Step ${stepNum}: ${label}`}
                  aria-label={`Step ${stepNum}: ${label}`}
                  className={`group relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    isActive
                      ? 'scale-105 bg-[#E84D1A] text-white shadow-sm shadow-orange-500/25'
                      : isCompleted
                        ? 'cursor-pointer bg-orange-50 text-[#E84D1A] hover:bg-orange-100/80'
                        : 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-[#E84D1A]'
                        : isCompleted
                          ? 'bg-[#E84D1A] text-white'
                          : 'bg-neutral-300 text-neutral-600'
                    }`}
                  >
                    {stepNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile / Tablet Compact Counter & Progress Bar */}
        <div className="flex items-center gap-3 lg:hidden">
          <span className="text-xs font-extrabold text-[#1A1A1E]">
            <span className="text-[#E84D1A]">{currentStep}</span> / {totalSteps}
          </span>
          <div className="h-2 w-20 overflow-hidden rounded-full border border-neutral-200/50 bg-neutral-100 p-0.5 sm:w-28">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#E84D1A] to-amber-500"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>
      </nav>
    </header>
  );
}
