'use client';

import Image from 'next/image';
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Mascot & Guide Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold uppercase tracking-wider">
          <span>CHAPTER 2 — Business Identity</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1E] tracking-tight">
          Tell us about your business.
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          What kind of business do you run? This helps Mitra tailor your AI campaign generator and copy tone.
        </p>

        {/* Mascot Pose Scene */}
        <div className="mt-2 p-5 bg-white/80 backdrop-blur-sm border border-neutral-200/80 rounded-3xl shadow-sm relative overflow-hidden text-center flex flex-col items-center">
          <Mascot state="point" size="xl" shadow animated />

          <div className="mt-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/50 text-xs font-semibold text-orange-950 text-left w-full">
            💡 <strong>Pro Tip:</strong> Choosing your exact business type unlocks pre-built menu,
            service, or property templates!
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-[#1A1A1E]">Business Basics</h2>
          <p className="text-sm text-neutral-500">
            Tell us about your business so we can set up your marketing correctly.
          </p>
        </div>

        <form onSubmit={onNext} className="space-y-6">
          {/* Business Name Input */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
              Business Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              type="text"
              required
              placeholder="e.g., Biryani House"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all"
            />
            {errors.name && <p className="text-red-600 mt-1.5 text-xs font-bold">{errors.name}</p>}
          </div>

          {/* Business Type Cards Selection */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-2">
              Business Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `bg-gradient-to-br ${cat.bg} border-[#E84D1A] ring-2 ring-[#E84D1A]/20 shadow-md`
                        : 'bg-white border-neutral-200/90 text-neutral-700 hover:bg-neutral-50/80 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#E84D1A] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="block text-base font-extrabold text-[#1A1A1E]">
                      {cat.title}
                    </span>
                    <span className="block text-xs font-semibold text-neutral-500 mt-0.5">
                      {cat.subtitle}
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-1.5 line-clamp-1">{cat.desc}</p>
                  </motion.button>
                );
              })}
            </div>
            {errors.category && (
              <p className="text-red-600 mt-1.5 text-xs font-bold">{errors.category}</p>
            )}
          </div>

          {/* Tagline / Description */}
          <div>
            <label className="block text-sm font-bold text-[#1A1A1E] mb-1.5">
              Short Tagline or Description (Optional)
            </label>
            <textarea
              value={form.description || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value || undefined }))
              }
              rows={2}
              placeholder="e.g., Authentic Dum Biryani since 2012"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Inline Salon Services Builder */}
          {isSalon && (
            <div className="pt-4 border-t border-neutral-100 space-y-4">
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
                      className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1E] focus:border-[#E84D1A] outline-none"
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
                      className="w-28 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1E] focus:border-[#E84D1A] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          services: prev.services.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="text-red-600 px-3 text-xs font-bold hover:bg-red-50 rounded-xl transition-colors"
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
                className="text-[#E84D1A] text-xs font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                + Add a service
              </button>

              {errors.services && (
                <p className="text-red-600 mt-1 text-xs font-bold">{errors.services}</p>
              )}
            </div>
          )}

          {/* Inline Real Estate Properties Builder */}
          {isRealEstate && (
            <div className="pt-4 border-t border-neutral-100 space-y-4">
              <h3 className="text-sm font-extrabold text-[#1A1A1E]">Properties</h3>
              <div className="space-y-3">
                {form.properties.map((prop, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2.5 rounded-2xl border border-neutral-200 p-3.5 bg-neutral-50/60 sm:grid-cols-3"
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
                      className="col-span-2 sm:col-span-3 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1A1A1E] focus:border-[#E84D1A] outline-none"
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
                      className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1A1A1E] focus:border-[#E84D1A] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          properties: prev.properties.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="text-red-600 col-span-2 sm:col-span-3 text-left text-xs font-bold hover:underline"
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
                className="text-[#E84D1A] text-xs font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                + Add a property
              </button>

              {errors.properties && (
                <p className="text-red-600 mt-1 text-xs font-bold">{errors.properties}</p>
              )}
            </div>
          )}

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
