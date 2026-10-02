'use client';

import Image from 'next/image';
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Story & Assembling Mascot */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold uppercase tracking-wider">
          <span>CHAPTER 7 — Business Brain Ready</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1E] tracking-tight">
          Let&apos;s review your details.
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Mitra is assembling your localized marketing profile. Verify your business information before initializing your workspace.
        </p>

        {/* Mascot Pose Scene */}
        <div className="mt-2 p-5 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-3xl shadow-sm relative overflow-hidden text-center flex flex-col items-center">
          <Mascot state="analyzing" size="xl" shadow animated />

          <div className="mt-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/50 text-xs font-semibold text-orange-950 text-left w-full flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span>
              <strong>Ready to Initialize:</strong> Submitting will generate your business ID, AI
              prompts, and initial campaign templates.
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Business Profile Object */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#1A1A1E]">Review Your Business</h2>
            <p className="text-sm text-neutral-500">
              Please verify the information is correct before submitting.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            ✓ Verified
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
            className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                🏢
              </span>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Business
                </span>
                <span className="text-sm font-extrabold text-[#1A1A1E] block">{form.name}</span>
                <span className="text-xs text-neutral-500 capitalize font-medium">
                  Category: {form.category.replace('_', ' ')}
                </span>
                {form.description && (
                  <p className="text-xs text-neutral-600 mt-0.5 italic">&quot;{form.description}&quot;</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(2)}
              className="text-xs font-bold text-[#E84D1A] hover:underline px-2 py-1"
            >
              Edit
            </button>
          </motion.div>

          {/* 2. Location */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                📍
              </span>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Location
                </span>
                <span className="text-sm font-bold text-[#1A1A1E] block">
                  {form.locality ? `${form.locality}, ` : ''}{form.city}, {form.state}
                </span>
                {form.address && <p className="text-xs text-neutral-500">{form.address}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(3)}
              className="text-xs font-bold text-[#E84D1A] hover:underline px-2 py-1"
            >
              Edit
            </button>
          </motion.div>

          {/* 3. Contact & Operations */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                📞
              </span>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Contact &amp; Operations
                </span>
                <span className="text-xs text-neutral-700 font-semibold block">
                  Phone: {form.phone} | WhatsApp: {form.whatsapp}
                </span>
                <span className="text-xs text-neutral-500 block mt-0.5">
                  Mode: {isSalon ? `Booking via ${form.bookingChannel}` : isRealEstate ? 'Property Brokerage' : form.dining}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(4)}
              className="text-xs font-bold text-[#E84D1A] hover:underline px-2 py-1"
            >
              Edit
            </button>
          </motion.div>

          {/* 4. Marketing Preferences */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                🎯
              </span>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Marketing Preferences
                </span>
                <span className="text-xs text-neutral-700 font-bold block">
                  Language: {form.language.toUpperCase()}
                </span>
                <span className="text-xs text-neutral-500 block mt-0.5">
                  Goals: {(form.goals || []).join(', ') || 'Get more customers'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(5)}
              className="text-xs font-bold text-[#E84D1A] hover:underline px-2 py-1"
            >
              Edit
            </button>
          </motion.div>

          {/* 5. Brand Style */}
          <motion.div
            variants={reduceMotion ? undefined : itemVariants}
            className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                🎨
              </span>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Brand Style
                </span>
                <span className="text-xs text-neutral-800 font-extrabold capitalize block">
                  {form.contentStyle || 'Modern & Clean'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep?.(6)}
              className="text-xs font-bold text-[#E84D1A] hover:underline px-2 py-1"
            >
              Edit
            </button>
          </motion.div>
        </motion.div>

        {/* Global Error Banner */}
        {errors.general && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-red-600 text-xs font-bold">{errors.general}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 flex items-center justify-between gap-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl bg-[#E84D1A] hover:bg-[#d03f10] text-white font-extrabold shadow-lg shadow-orange-600/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
