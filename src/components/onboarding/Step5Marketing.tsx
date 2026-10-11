'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { REGIONAL_STYLES, CAMPAIGN_STYLES } from '@/lib/constants';
import type { OnboardingFormData, StepErrors } from './types';

interface Step5MarketingProps {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: StepErrors;
  onNext: (e: React.FormEvent) => void;
  onBack: () => void;
}

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'te', label: 'Telugu' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ta', label: 'Tamil' },
  { id: 'te_en', label: 'Telugu + English' },
  { id: 'hi_en', label: 'Hindi + English' },
] as const;

const GOAL_OPTIONS = [
  'Get more customers',
  'Increase orders / bookings',
  'Build brand awareness',
  'Promote special offers',
];

export function Step5Marketing({
  form,
  setForm,
  errors: _errors,
  onNext,
  onBack,
}: Step5MarketingProps) {
  const reduceMotion = useReducedMotion();

  const toggleGoal = (goal: string) => {
    const currentGoals = form.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter((g) => g !== goal)
      : [...currentGoals, goal];

    setForm((prev) => ({ ...prev, goals: newGoals }));
  };

  const getPreviewSentence = () => {
    switch (form.language) {
      case 'te':
        return 'ఈ వీకెండ్ స్పెషల్ — ఇప్పుడే ఆర్డర్ చేయండి! మన సిటీలో బెస్ట్ ఆఫర్స్ 🔥';
      case 'hi':
        return 'आपके शहर में सबसे बेहतरीन ऑफर्स! 🍲 व्हाट्सएप पर ऑर्डर करें।';
      case 'ta':
        return 'இந்த வார சிறப்பு சலுகை — இப்போதே ஆர்டர் செய்யுங்கள்! 🔥';
      case 'te_en':
        return 'Mana Hyderabad lo authentic taste & daily special offers! 🔥 Direct WhatsApp booking available.';
      case 'hi_en':
        return 'Weekend special — ab order karo! Direct WhatsApp delivery ready.';
      default:
        return 'Experience top quality local offers right in your neighborhood. 🚀 Order today!';
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Mascot & Signal Visual Column */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
          <span>CHAPTER 5 — Marketing Brain</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#1A1A1E] sm:text-3xl">
          What kind of marketing works best for you?
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Tell Mitra your target goals and dialect so your AI marketing engine learns how to speak
          to your customers.
        </p>

        {/* Hand-drawn style note */}
        <div className="relative inline-flex w-fit items-center gap-2 rounded-2xl border border-amber-200/60 bg-amber-50/90 px-3.5 py-2 text-xs font-bold text-amber-900">
          <span>🎯</span>
          <span>Your business. Your goals.</span>
        </div>

        {/* Mascot Pose Scene with Floating Signals */}
        <div className="relative mt-1 flex flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm">
          {/* Signal labels drifting toward Mitra */}
          <div className="relative flex h-12 w-full flex-wrap items-center justify-center gap-2 overflow-hidden">
            {(form.goals || []).map((goal, idx) => (
              <motion.span
                key={goal}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="rounded-full bg-[#E84D1A] px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs"
              >
                ✓ {goal}
              </motion.span>
            ))}
          </div>

          <Mascot state="curious" size="xl" shadow animated />

          <div className="mt-2 w-full rounded-xl border border-orange-200/50 bg-orange-50/70 p-3 text-left text-xs font-semibold text-orange-950">
            🧠 <strong>Mitra is learning:</strong> Collecting your signal preferences to customize
            ad copy, images, reels, and WhatsApp messages!
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Marketing Preferences</h2>
          <p className="text-sm text-neutral-500">
            Help us generate marketing content that resonates with your audience.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Preferred Language Selection */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#1A1A1E]">
              Preferred Languages *
            </label>
            <div className="flex flex-wrap gap-2.5">
              {LANGUAGES.map((lang) => {
                const isSelected = form.language === lang.id;

                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        language: lang.id as OnboardingFormData['language'],
                      }))
                    }
                    className={`cursor-pointer rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
                      isSelected
                        ? 'scale-105 bg-[#E84D1A] text-white shadow-md shadow-orange-500/20'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Voice Preview Box */}
          <motion.div
            key={form.language}
            initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1 rounded-2xl border border-orange-200/70 bg-orange-50/80 p-4"
          >
            <span className="block text-[11px] font-extrabold tracking-wider text-[#E84D1A] uppercase">
              Live Dialect Preview
            </span>
            <p className="text-xs leading-relaxed font-semibold text-neutral-800 italic">
              &quot;{getPreviewSentence()}&quot;
            </p>
          </motion.div>

          {/* Campaign Goals Checkboxes */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#1A1A1E]">Campaign Goals *</label>
            <div className="space-y-2.5">
              {GOAL_OPTIONS.map((goal) => {
                const isChecked = (form.goals || []).includes(goal);

                return (
                  <label
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                      isChecked
                        ? 'border-[#E84D1A] bg-orange-50/70 font-bold text-orange-950'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-sm">{goal}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4 w-4 rounded text-[#E84D1A] accent-[#E84D1A] focus:ring-[#E84D1A]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Regional & Content Style Selectors */}
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-[#1A1A1E]">
                Regional Style *
              </label>
              <select
                value={form.regionalStyle}
                onChange={(e) => setForm((prev) => ({ ...prev, regionalStyle: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] outline-none focus:border-[#E84D1A]"
              >
                {REGIONAL_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-[#1A1A1E]">Content Style *</label>
              <select
                value={form.contentStyle}
                onChange={(e) => setForm((prev) => ({ ...prev, contentStyle: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] outline-none focus:border-[#E84D1A]"
              >
                {CAMPAIGN_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="rounded-2xl border border-neutral-200 px-6 py-3 font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="rounded-2xl bg-[#E84D1A] px-8 py-3.5 font-bold text-white shadow-md shadow-orange-600/20 hover:bg-[#d03f10]"
            >
              Continue →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
