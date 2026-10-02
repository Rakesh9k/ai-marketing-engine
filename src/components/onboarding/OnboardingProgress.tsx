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
    <header className="sticky top-3 z-40 px-4 sm:px-6 max-w-6xl mx-auto w-full">
      <nav className="bg-white/90 backdrop-blur-md border border-amber-100/80 rounded-full px-5 py-3 shadow-lg shadow-amber-950/5 flex items-center justify-between transition-all">
        {/* Mitra Brand Identifier */}
        <div className="flex items-center gap-2.5">
          <MitraShortLogo size="md" decorative />
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-[#1A1A1E]">Mitra</span>
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-[#E84D1A] font-semibold border border-orange-200/60">
              by Brainwise
            </span>
          </div>
        </div>

        {/* Desktop Stepper Navigation */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 relative">
            {/* Background connecting bar */}
            <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 -z-10" />

            {/* Active connecting fill bar */}
            <motion.div
              className="absolute left-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#E84D1A] -z-10"
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
                  className={`group relative flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#E84D1A] text-white shadow-sm shadow-orange-500/25 scale-105'
                      : isCompleted
                        ? 'bg-orange-50 text-[#E84D1A] hover:bg-orange-100/80 cursor-pointer'
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
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
        <div className="flex lg:hidden items-center gap-3">
          <span className="text-xs font-extrabold text-[#1A1A1E]">
            <span className="text-[#E84D1A]">{currentStep}</span> / {totalSteps}
          </span>
          <div className="w-20 sm:w-28 h-2 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200/50">
            <motion.div
              className="h-full bg-gradient-to-r from-[#E84D1A] to-amber-500 rounded-full"
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
