'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { OnboardingFormData, StepErrors } from './types';

interface Step4ContactProps {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: StepErrors;
  onNext: (e: React.FormEvent) => void;
  onBack: () => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Step4Contact({
  form,
  setForm,
  errors,
  onNext,
  onBack,
}: Step4ContactProps) {
  const reduceMotion = useReducedMotion();
  const [activeField, setActiveField] = useState<'phone' | 'whatsapp' | 'email' | 'hours' | null>(null);

  const toggleDay = (day: string) => {
    const currentDays = form.businessHours.openDays;
    const isAlreadySelected = currentDays.includes(day);
    const newDays = isAlreadySelected
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    setForm((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        openDays: newDays,
        open7Days: newDays.length === 7,
      },
    }));
  };

  const toggle7Days = () => {
    const newOpen7 = !form.businessHours.open7Days;
    setForm((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        open7Days: newOpen7,
        openDays: newOpen7 ? [...DAYS] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      },
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Mascot & Guide Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold uppercase tracking-wider">
          <span>CHAPTER 4 — Contact &amp; Timings</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1E] tracking-tight">
            How can customers reach you?
          </h1>
        </div>

        <p className="text-sm text-neutral-600 leading-relaxed">
          Add your contact details and business timings so customers can easily get in touch or book orders directly.
        </p>

        {/* Hand-drawn style floating tag */}
        <div className="relative inline-flex items-center gap-2 text-xs font-bold text-[#E84D1A] bg-orange-50/80 border border-orange-200/60 px-3.5 py-2 rounded-2xl w-fit">
          <span>📱</span>
          <span>Stay connected!</span>
        </div>

        {/* Mascot Pose Scene */}
        <div className="mt-1 p-5 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-3xl shadow-sm relative overflow-hidden text-center flex flex-col items-center">
          <Mascot state="helper" size="xl" shadow animated />

          <div className="mt-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/50 text-xs font-semibold text-orange-950 text-left w-full flex items-center gap-2">
            <motion.span
              animate={activeField ? { scale: [1, 1.25, 1] } : undefined}
              className="text-base"
            >
              {activeField === 'phone' ? '📞' : activeField === 'whatsapp' ? '💬' : activeField === 'email' ? '✉️' : '⏰'}
            </motion.span>
            <span>
              {activeField === 'phone'
                ? 'Primary phone calls route straight to your counter.'
                : activeField === 'whatsapp'
                  ? 'WhatsApp links allow instant one-tap customer orders!'
                  : activeField === 'email'
                    ? 'Email receives weekly campaign reports.'
                    : 'Mitra automatically displays "Open Now" badges during business hours!'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Contact &amp; Operations</h2>
          <p className="text-sm text-neutral-500">
            How customers can reach you and what services you offer.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Phone & WhatsApp Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  onFocus={() => setActiveField('phone')}
                  onBlur={() => setActiveField(null)}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
                />
              </div>
              {errors.phone && <p className="text-red-600 mt-1.5 text-xs font-bold">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
                WhatsApp Number *
              </label>
              <div className="relative">
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  onFocus={() => setActiveField('whatsapp')}
                  onBlur={() => setActiveField(null)}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
                />
              </div>
              {errors.whatsapp && (
                <p className="text-red-600 mt-1.5 text-xs font-bold">{errors.whatsapp}</p>
              )}
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
              Email Address (Optional)
            </label>
            <input
              value={form.email || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value || undefined }))}
              onFocus={() => setActiveField('email')}
              onBlur={() => setActiveField(null)}
              type="email"
              placeholder="you@yourbusiness.com"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
            />
          </div>

          {/* Operating Mode / Buying Mode */}
          {form.category === 'restaurant' ? (
            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
                How do customers buy from you? *
              </label>
              <select
                value={form.dining}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    dining: e.target.value as 'dine-in' | 'takeaway' | 'delivery',
                  }))
                }
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
              >
                <option value="dine-in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
                Preferred booking channel
              </label>
              <select
                value={form.bookingChannel}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bookingChannel: e.target.value as 'whatsapp' | 'phone' | 'in_person',
                  }))
                }
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone call</option>
                <option value="in_person">In person / walk-in</option>
              </select>
            </div>
          )}

          {/* Business Hours Section */}
          <div
            className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/60 space-y-4"
            onFocus={() => setActiveField('hours')}
            onBlur={() => setActiveField(null)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#1A1A1E]">Business Hours</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.businessHours.open7Days}
                  onChange={toggle7Days}
                  className="w-4 h-4 rounded text-[#E84D1A] focus:ring-[#E84D1A] accent-[#E84D1A]"
                />
                <span className="text-xs font-bold text-neutral-600">Open 7 days a week</span>
              </label>
            </div>

            {/* Day Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const isSelected = form.businessHours.openDays.includes(day);

                return (
                  <motion.button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E84D1A] text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>

            {/* Opening & Closing Times */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Opens at</label>
                <input
                  type="time"
                  value={form.businessHours.openTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      businessHours: { ...prev.businessHours, openTime: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-[#1A1A1E] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Closes at</label>
                <input
                  type="time"
                  value={form.businessHours.closeTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      businessHours: { ...prev.businessHours, closeTime: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-[#1A1A1E] outline-none"
                />
              </div>
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
