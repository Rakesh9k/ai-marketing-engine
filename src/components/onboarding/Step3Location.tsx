'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { OnboardingFormData, StepErrors } from './types';

interface Step3LocationProps {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: StepErrors;
  onNext: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function Step3Location({ form, setForm, errors, onNext, onBack }: Step3LocationProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Mascot & Story Column */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
          <span>CHAPTER 3 — Local Context</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#1A1A1E] sm:text-3xl">
          Where is your business located?
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Local context helps Mitra craft location-specific offers that target customers in your
          exact city and neighborhood.
        </p>

        {/* Mascot Pose Scene */}
        <div className="relative mt-2 flex flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm">
          <Mascot state="curious" size="xl" shadow animated />

          <div className="mt-2 w-full rounded-xl border border-amber-200/50 bg-amber-50/70 p-3 text-left text-xs font-semibold text-amber-950">
            📍 <strong>Local Targeting:</strong> Ad campaigns perform 3x better when localized with
            your area &amp; city landmarks!
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Location</h2>
          <p className="text-sm text-neutral-500">
            Your location helps us target customers in your area.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Address Line */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
              Full Address (Optional)
            </label>
            <input
              value={form.address || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value || undefined }))
              }
              type="text"
              placeholder="Shop No. 12, Green Park, Main Road"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
            />
          </div>

          {/* City & State Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">City *</label>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                type="text"
                placeholder="e.g., Hyderabad"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
              />
              {errors.city && (
                <p className="mt-1.5 text-xs font-bold text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">State *</label>
              <input
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                type="text"
                placeholder="e.g., Telangana"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
              />
              {errors.state && (
                <p className="mt-1.5 text-xs font-bold text-red-600">{errors.state}</p>
              )}
            </div>
          </div>

          {/* Locality & Pincode Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
                Locality / Area (Optional)
              </label>
              <input
                value={form.locality || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, locality: e.target.value || undefined }))
                }
                type="text"
                placeholder="e.g., Kondapur"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
                Pincode (Optional)
              </label>
              <input
                value={form.pincode || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pincode: e.target.value || undefined }))
                }
                type="text"
                placeholder="500084"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
              />
            </div>
          </div>

          {/* Stylized Interactive Map Preview Card */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-amber-50/40 p-5">
            <div className="pointer-events-none absolute inset-0 opacity-15">
              <svg className="h-full w-full" viewBox="0 0 400 160">
                <path
                  d="M 0 40 L 400 40 M 0 100 L 400 100 M 120 0 L 120 160 M 280 0 L 280 160"
                  stroke="#1A1A1E"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated Location Marker with pulsing ring */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={
                      reduceMotion ? undefined : { scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute h-8 w-8 rounded-full bg-[#E84D1A]/30"
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#E84D1A] text-lg text-white shadow-md">
                    📍
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
                    Localized Radius Active
                  </span>
                  <span className="block text-sm font-bold text-[#1A1A1E]">
                    {form.city
                      ? `${form.locality ? `${form.locality}, ` : ''}${form.city}`
                      : 'Target Area'}
                    {form.pincode ? ` • ${form.pincode}` : ''}
                  </span>
                </div>
              </div>

              <span className="rounded-full border border-amber-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
                Edit location
              </span>
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
