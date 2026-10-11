'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { OnboardingFormData, StepErrors } from './types';

interface Step7ReviewProps {
  form: OnboardingFormData;
  errors: StepErrors;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onJumpToStep?: (step: number) => void;
}

export function Step7Review({
  form,
  errors,
  isSaving,
  onSubmit,
  onBack,
  onJumpToStep,
}: Step7ReviewProps) {
  const reduceMotion = useReducedMotion();
  const isSalon = form.category === 'salon';
  const isRealEstate = form.category === 'real_estate';

  // Stagger animation container
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Column: Story & Assembling Mascot */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
          <span>CHAPTER 7 — Business Brain Ready</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#1A1A1E] sm:text-3xl">
          Let&apos;s review your details.
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Mitra is assembling your localized marketing profile. Verify your business information
          before initializing your workspace.
        </p>

        {/* Mascot Pose Scene */}
        <div className="relative mt-2 flex flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm">
          <Mascot state="analyzing" size="xl" shadow animated />

          <div className="mt-2 flex w-full items-center gap-2 rounded-xl border border-orange-200/50 bg-orange-50/70 p-3 text-left text-xs font-semibold text-orange-950">
            <span className="text-base">⚡</span>
            <span>
              <strong>Ready to Initialize:</strong> Submitting will generate your business ID, AI
              prompts, and initial campaign templates.
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Business Profile Object */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#1A1A1E]">Review Your Business</h2>
            <p className="text-sm text-neutral-500">
              Please verify the information is correct before submitting.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Ready to submit
          </span>
        </div>

        {/* Sequential Stagger Profile Cards */}
        <motion.div
          variants={reduceMotion ? undefined : containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {/* 1. Business Basics */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-neutral-200 bg-white p-2 text-xl shadow-2xs">
                🏢
              </span>
              <div>
                <span className="block text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  Business
                </span>
                <span className="block text-sm font-extrabold text-[#1A1A1E]">{form.name}</span>
                <span className="text-xs font-medium text-neutral-500 capitalize">
                  Category: {form.category.replace('_', ' ')}
                </span>
                {form.description && (
                  <p className="mt-0.5 text-xs text-neutral-600 italic">
                    &quot;{form.description}&quot;
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(2)}
              className="px-2 py-1 text-xs font-bold text-[#E84D1A] hover:underline"
            >
              Edit
            </button>
          </motion.div>

          {/* 2. Location */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-neutral-200 bg-white p-2 text-xl shadow-2xs">
                📍
              </span>
              <div>
                <span className="block text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  Location
                </span>
                <span className="block text-sm font-bold text-[#1A1A1E]">
                  {form.locality ? `${form.locality}, ` : ''}
                  {form.city}, {form.state}
                </span>
                {form.address && <p className="text-xs text-neutral-500">{form.address}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(3)}
              className="px-2 py-1 text-xs font-bold text-[#E84D1A] hover:underline"
            >
              Edit
            </button>
          </motion.div>

          {/* 3. Contact & Operations */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-neutral-200 bg-white p-2 text-xl shadow-2xs">
                📞
              </span>
              <div>
                <span className="block text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  Contact &amp; Operations
                </span>
                <span className="block text-xs font-semibold text-neutral-700">
                  Phone: {form.phone} | WhatsApp: {form.whatsapp}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Mode:{' '}
                  {isSalon
                    ? `Booking via ${form.bookingChannel}`
                    : isRealEstate
                      ? 'Property Brokerage'
                      : form.dining}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(4)}
              className="px-2 py-1 text-xs font-bold text-[#E84D1A] hover:underline"
            >
              Edit
            </button>
          </motion.div>

          {/* 4. Marketing Preferences */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-neutral-200 bg-white p-2 text-xl shadow-2xs">
                🎯
              </span>
              <div>
                <span className="block text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  Marketing Preferences
                </span>
                <span className="block text-xs font-bold text-neutral-700">
                  Language: {form.language.toUpperCase()}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Goals: {(form.goals || []).join(', ') || 'Get more customers'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(5)}
              className="px-2 py-1 text-xs font-bold text-[#E84D1A] hover:underline"
            >
              Edit
            </button>
          </motion.div>

          {/* 5. Brand Style */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-neutral-200 bg-white p-2 text-xl shadow-2xs">
                🎨
              </span>
              <div>
                <span className="block text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  Brand Style
                </span>
                <span className="block text-xs font-extrabold text-neutral-800 capitalize">
                  {form.contentStyle || 'Modern & Clean'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(6)}
              className="px-2 py-1 text-xs font-bold text-[#E84D1A] hover:underline"
            >
              Edit
            </button>
          </motion.div>
        </motion.div>

        {/* Global Error Banner */}
        {errors.general && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3.5">
            <p className="text-xs font-bold text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={isSaving}
            className="rounded-2xl border border-neutral-200 px-6 py-3 font-bold text-neutral-700 hover:bg-neutral-50"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="cursor-pointer rounded-2xl bg-[#E84D1A] px-8 py-3.5 font-extrabold text-white shadow-lg shadow-orange-600/25 transition-all hover:scale-[1.02] hover:bg-[#d03f10]"
          >
            {isSaving ? 'Saving...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
