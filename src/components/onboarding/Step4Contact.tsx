'use client';

import { useState } from 'react';
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

export function Step4Contact({ form, setForm, errors, onNext, onBack }: Step4ContactProps) {
  const reduceMotion = useReducedMotion();
  const [activeField, setActiveField] = useState<'phone' | 'whatsapp' | 'email' | 'hours' | null>(
    null
  );

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
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Mascot & Guide Column */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
          <span>CHAPTER 4 — Contact &amp; Timings</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-[#1A1A1E] sm:text-3xl">
            How can customers reach you?
          </h1>
        </div>

        <p className="text-sm leading-relaxed text-neutral-600">
          Add your contact details and business timings so customers can easily get in touch or book
          orders directly.
        </p>

        {/* Hand-drawn style floating tag */}
        <div className="relative inline-flex w-fit items-center gap-2 rounded-2xl border border-orange-200/60 bg-orange-50/80 px-3.5 py-2 text-xs font-bold text-[#E84D1A]">
          <span>📱</span>
          <span>Stay connected!</span>
        </div>

        {/* Mascot Pose Scene */}
        <div className="relative mt-1 flex flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm">
          <Mascot state="helper" size="xl" shadow animated />

          <div className="mt-2 flex w-full items-center gap-2 rounded-xl border border-orange-200/50 bg-orange-50/70 p-3 text-left text-xs font-semibold text-orange-950">
            <motion.span
              animate={activeField ? { scale: [1, 1.25, 1] } : undefined}
              className="text-base"
            >
              {activeField === 'phone'
                ? '📞'
                : activeField === 'whatsapp'
                  ? '💬'
                  : activeField === 'email'
                    ? '✉️'
                    : '⏰'}
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
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Contact &amp; Operations</h2>
          <p className="text-sm text-neutral-500">
            How customers can reach you and what services you offer.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Phone & WhatsApp Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
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
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs font-bold text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
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
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
                />
              </div>
              {errors.whatsapp && (
                <p className="mt-1.5 text-xs font-bold text-red-600">{errors.whatsapp}</p>
              )}
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
              Email Address (Optional)
            </label>
            <input
              value={form.email || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value || undefined }))}
              onFocus={() => setActiveField('email')}
              onBlur={() => setActiveField(null)}
              type="email"
              placeholder="you@yourbusiness.com"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
            />
          </div>

          {/* Operating Mode / Buying Mode */}
          {form.category === 'restaurant' ? (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
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
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
              >
                <option value="dine-in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
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
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone call</option>
                <option value="in_person">In person / walk-in</option>
              </select>
            </div>
          )}

          {/* Business Hours Section */}
          <div
            className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5"
            onFocus={() => setActiveField('hours')}
            onBlur={() => setActiveField(null)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#1A1A1E]">Business Hours</span>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.businessHours.open7Days}
                  onChange={toggle7Days}
                  className="h-4 w-4 rounded text-[#E84D1A] accent-[#E84D1A] focus:ring-[#E84D1A]"
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
                    className={`h-9 w-9 cursor-pointer rounded-xl text-xs font-extrabold transition-all sm:h-10 sm:w-10 ${
                      isSelected
                        ? 'bg-[#E84D1A] text-white shadow-xs'
                        : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
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
                <label className="mb-1 block text-xs font-bold text-neutral-500">Opens at</label>
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
                <label className="mb-1 block text-xs font-bold text-neutral-500">Closes at</label>
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
