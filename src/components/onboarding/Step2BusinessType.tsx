'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { OnboardingFormData, StepErrors } from './types';

interface Step2BusinessTypeProps {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: StepErrors;
  onNext: (e: React.FormEvent) => void;
  onBack: () => void;
}

const CATEGORIES = [
  {
    id: 'restaurant',
    title: 'Restaurant',
    subtitle: 'Food & Dining',
    icon: '🍲',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-orange-200',
    activeRing: 'ring-orange-500/30 border-[#E84D1A]',
    desc: 'Biryani, Cafes, Cloud Kitchens, Bakeries',
  },
  {
    id: 'salon',
    title: 'Salon & Beauty',
    subtitle: 'Beauty & Wellness',
    icon: '💅',
    bg: 'from-pink-50 to-rose-50',
    border: 'border-pink-200',
    activeRing: 'ring-pink-500/30 border-[#E84D1A]',
    desc: 'Hair Salons, Spas, Skincare Clinics, Makeup',
  },
  {
    id: 'real_estate',
    title: 'Real Estate',
    subtitle: 'Listings & Brokerage',
    icon: '🏡',
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    activeRing: 'ring-emerald-500/30 border-[#E84D1A]',
    desc: 'Villas, Apartments, Commercial Plots',
  },
  {
    id: 'other',
    title: 'Other',
    subtitle: 'Custom Business',
    icon: '✨',
    bg: 'from-slate-50 to-neutral-100',
    border: 'border-neutral-200',
    activeRing: 'ring-neutral-500/30 border-[#E84D1A]',
    desc: 'Retail, Services, Agencies & More',
  },
] as const;

export function Step2BusinessType({
  form,
  setForm,
  errors,
  onNext,
  onBack,
}: Step2BusinessTypeProps) {
  const reduceMotion = useReducedMotion();
  const isSalon = form.category === 'salon';
  const isRealEstate = form.category === 'real_estate';

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Mascot & Guide Column */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
          <span>CHAPTER 2 — Business Identity</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#1A1A1E] sm:text-3xl">
          Tell us about your business.
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          What kind of business do you run? This helps Mitra tailor your AI campaign generator and
          copy tone.
        </p>

        {/* Mascot Pose Scene */}
        <div className="relative mt-2 flex flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm">
          <Mascot state="point" size="xl" shadow animated />

          <div className="mt-2 w-full rounded-xl border border-orange-200/50 bg-orange-50/70 p-3 text-left text-xs font-semibold text-orange-950">
            💡 <strong>Pro Tip:</strong> Choosing your exact business type unlocks pre-built menu,
            service, or property templates!
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Business Basics</h2>
          <p className="text-sm text-neutral-500">
            Tell us about your business so we can set up your marketing correctly.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Business Name Input */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">Business Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              type="text"
              required
              placeholder="e.g., Biryani House"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
            />
            {errors.name && <p className="mt-1.5 text-xs font-bold text-red-600">{errors.name}</p>}
          </div>

          {/* Business Type Cards Selection */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#1A1A1E]">Business Type *</label>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {CATEGORIES.map((cat) => {
                const isSelected = form.category === cat.id;

                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        category: cat.id as OnboardingFormData['category'],
                      }))
                    }
                    aria-pressed={isSelected}
                    whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className={`relative cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${cat.bg} border-[#E84D1A] shadow-md ring-2 ring-[#E84D1A]/20`
                        : 'border-neutral-200/90 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="mb-1 text-2xl">{cat.icon}</span>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E84D1A] text-xs font-bold text-white shadow-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="block text-base font-extrabold text-[#1A1A1E]">
                      {cat.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-neutral-500">
                      {cat.subtitle}
                    </span>
                    <p className="mt-1.5 line-clamp-1 text-[11px] text-neutral-400">{cat.desc}</p>
                  </motion.button>
                );
              })}
            </div>
            {errors.category && (
              <p className="mt-1.5 text-xs font-bold text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Tagline / Description */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#1A1A1E]">
              Short Tagline or Description (Optional)
            </label>
            <textarea
              value={form.description || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value || undefined }))
              }
              rows={2}
              placeholder="e.g., Authentic Dum Biryani since 2012"
              className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
            />
          </div>

          {/* Inline Salon Services Builder */}
          {isSalon && (
            <div className="space-y-4 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1A1A1E]">Services &amp; Packages</h3>
                  <p className="text-xs text-neutral-500">
                    Add the services you offer so Mitra can generate accurate ads.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {form.services.map((svc, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={svc.name}
                      onChange={(e) => {
                        const services = [...form.services];
                        services[i] = { ...services[i]!, name: e.target.value };
                        setForm((prev) => ({ ...prev, services }));
                      }}
                      type="text"
                      placeholder="e.g., Haircut & Styling"
                      className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1E] outline-none focus:border-[#E84D1A]"
                    />
                    <input
                      value={svc.price}
                      onChange={(e) => {
                        const services = [...form.services];
                        services[i] = { ...services[i]!, price: e.target.value };
                        setForm((prev) => ({ ...prev, services }));
                      }}
                      type="number"
                      min="0"
                      placeholder="Price (₹)"
                      className="w-28 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1E] outline-none focus:border-[#E84D1A]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          services: prev.services.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="rounded-xl px-3 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                      aria-label="Remove service"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    services: [...prev.services, { name: '', category: 'other', price: '' }],
                  }))
                }
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-extrabold text-[#E84D1A] hover:underline"
              >
                + Add a service
              </button>

              {errors.services && (
                <p className="mt-1 text-xs font-bold text-red-600">{errors.services}</p>
              )}
            </div>
          )}

          {/* Inline Real Estate Properties Builder */}
          {isRealEstate && (
            <div className="space-y-4 border-t border-neutral-100 pt-4">
              <h3 className="text-sm font-extrabold text-[#1A1A1E]">Properties</h3>
              <div className="space-y-3">
                {form.properties.map((prop, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2.5 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3.5 sm:grid-cols-3"
                  >
                    <input
                      value={prop.title}
                      onChange={(e) => {
                        const properties = [...form.properties];
                        properties[i] = { ...properties[i]!, title: e.target.value };
                        setForm((prev) => ({ ...prev, properties }));
                      }}
                      type="text"
                      placeholder="e.g., 3BHK in Green Meadows"
                      className="col-span-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1A1A1E] outline-none focus:border-[#E84D1A] sm:col-span-3"
                    />
                    <input
                      value={prop.price}
                      onChange={(e) => {
                        const properties = [...form.properties];
                        properties[i] = { ...properties[i]!, price: e.target.value };
                        setForm((prev) => ({ ...prev, properties }));
                      }}
                      type="number"
                      min="0"
                      placeholder="Price (₹)"
                      className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1A1A1E] outline-none focus:border-[#E84D1A]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          properties: prev.properties.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="col-span-2 text-left text-xs font-bold text-red-600 hover:underline sm:col-span-3"
                      aria-label="Remove property"
                    >
                      Remove Property
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    properties: [
                      ...prev.properties,
                      {
                        title: '',
                        propertyType: 'apartment',
                        areaSqft: '',
                        bedrooms: '',
                        bathrooms: '',
                        price: '',
                        possessionStatus: 'ready_to_move',
                      },
                    ],
                  }))
                }
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-extrabold text-[#E84D1A] hover:underline"
              >
                + Add a property
              </button>

              {errors.properties && (
                <p className="mt-1 text-xs font-bold text-red-600">{errors.properties}</p>
              )}
            </div>
          )}

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
