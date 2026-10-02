'use client';

import Image from 'next/image';
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

export function Step3Location({
  form,
  setForm,
  errors,
  onNext,
  onBack,
}: Step3LocationProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Mascot & Story Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold uppercase tracking-wider">
          <span>CHAPTER 3 — Local Context</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1E] tracking-tight">
          Where is your business located?
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Local context helps Mitra craft location-specific offers that target customers in your exact city and neighborhood.
        </p>

        {/* Mascot Pose Scene */}
        <div className="mt-2 p-5 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-3xl shadow-sm relative overflow-hidden text-center flex flex-col items-center">
          <Mascot state="curious" size="xl" shadow animated />

          <div className="mt-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/50 text-xs font-semibold text-amber-950 text-left w-full">
            📍 <strong>Local Targeting:</strong> Ad campaigns perform 3x better when localized with
            your area &amp; city landmarks!
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Location</h2>
          <p className="text-sm text-neutral-500">
            Your location helps us target customers in your area.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Address Line */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
              Full Address (Optional)
            </label>
            <input
              value={form.address || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value || undefined }))}
              type="text"
              placeholder="Shop No. 12, Green Park, Main Road"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
            />
          </div>

          {/* City & State Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">City *</label>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                type="text"
                placeholder="e.g., Hyderabad"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
              />
              {errors.city && <p className="text-red-600 mt-1.5 text-xs font-bold">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">State *</label>
              <input
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                type="text"
                placeholder="e.g., Telangana"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
              />
              {errors.state && (
                <p className="text-red-600 mt-1.5 text-xs font-bold">{errors.state}</p>
              )}
            </div>
          </div>

          {/* Locality & Pincode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
                Locality / Area (Optional)
              </label>
              <input
                value={form.locality || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, locality: e.target.value || undefined }))
                }
                type="text"
                placeholder="e.g., Kondapur"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
                Pincode (Optional)
              </label>
              <input
                value={form.pincode || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pincode: e.target.value || undefined }))
                }
                type="text"
                placeholder="500084"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Stylized Interactive Map Preview Card */}
          <div className="relative rounded-2xl border border-neutral-200 bg-amber-50/40 p-5 overflow-hidden">
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 400 160">
                <path d="M 0 40 L 400 40 M 0 100 L 400 100 M 120 0 L 120 160 M 280 0 L 280 160" stroke="#1A1A1E" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated Location Marker with pulsing ring */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={reduceMotion ? undefined : { scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute w-8 h-8 rounded-full bg-[#E84D1A]/30"
                  />
                  <div className="w-9 h-9 rounded-2xl bg-[#E84D1A] text-white flex items-center justify-center shadow-md text-lg">
                    📍
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-[#E84D1A]">
                    Localized Radius Active
                  </span>
                  <span className="block text-sm font-bold text-[#1A1A1E]">
                    {form.city ? `${form.locality ? `${form.locality}, ` : ''}${form.city}` : 'Target Area'}
                    {form.pincode ? ` • ${form.pincode}` : ''}
                  </span>
                </div>
              </div>

              <span className="text-xs font-bold text-amber-900 bg-white/90 border border-amber-200 px-3 py-1.5 rounded-full shadow-2xs">
                Edit location
              </span>
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
