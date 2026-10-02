'use client';

import Image from 'next/image';
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
  errors,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Mascot & Signal Visual Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold uppercase tracking-wider">
          <span>CHAPTER 5 — Marketing Brain</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1E] tracking-tight">
          What kind of marketing works best for you?
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Tell Mitra your target goals and dialect so your AI marketing engine learns how to speak to your customers.
        </p>

        {/* Hand-drawn style note */}
        <div className="relative inline-flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50/90 border border-amber-200/60 px-3.5 py-2 rounded-2xl w-fit">
          <span>🎯</span>
          <span>Your business. Your goals.</span>
        </div>

        {/* Mascot Pose Scene with Floating Signals */}
        <div className="mt-1 p-5 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-3xl shadow-sm relative overflow-hidden text-center flex flex-col items-center">
          {/* Signal labels drifting toward Mitra */}
          <div className="w-full relative h-12 flex items-center justify-center gap-2 flex-wrap overflow-hidden">
            {(form.goals || []).map((goal, idx) => (
              <motion.span
                key={goal}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E84D1A] text-white shadow-2xs"
              >
                ✓ {goal}
              </motion.span>
            ))}
          </div>

          <Mascot state="curious" size="xl" shadow animated />

          <div className="mt-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/50 text-xs font-semibold text-orange-950 text-left w-full">
            🧠 <strong>Mitra is learning:</strong> Collecting your signal preferences to customize ad
            copy, posters, and WhatsApp automation!
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Marketing Preferences</h2>
          <p className="text-sm text-neutral-500">
            Help us generate marketing content that resonates with your audience.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Preferred Language Selection */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-2">
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
                    className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E84D1A] text-white shadow-md shadow-orange-500/20 scale-105'
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
            className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/70 space-y-1"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#E84D1A] block">
              Live Dialect Preview
            </span>
            <p className="text-xs font-semibold text-neutral-800 italic leading-relaxed">
              &quot;{getPreviewSentence()}&quot;
            </p>
          </motion.div>

          {/* Campaign Goals Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-2">
              Campaign Goals *
            </label>
            <div className="space-y-2.5">
              {GOAL_OPTIONS.map((goal) => {
                const isChecked = (form.goals || []).includes(goal);

                return (
                  <label
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-orange-50/70 border-[#E84D1A] text-orange-950 font-bold'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-sm">{goal}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-[#E84D1A] focus:ring-[#E84D1A] accent-[#E84D1A]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Regional & Content Style Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1">
                Regional Style *
              </label>
              <select
                value={form.regionalStyle}
                onChange={(e) => setForm((prev) => ({ ...prev, regionalStyle: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] focus:border-[#E84D1A] outline-none"
              >
                {REGIONAL_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1">
                Content Style *
              </label>
              <select
                value={form.contentStyle}
                onChange={(e) => setForm((prev) => ({ ...prev, contentStyle: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] focus:border-[#E84D1A] outline-none"
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
          <div className="pt-6 flex items-center justify-between gap-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="px-6 py-3 rounded-2xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-[#E84D1A] hover:bg-[#d03f10] text-white font-bold shadow-md shadow-orange-600/20"
            >
              Continue →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
