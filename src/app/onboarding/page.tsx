'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';
import { callFunction } from '@/services/api';
import { getFirebaseAuth } from '@/lib/firebase/client';

import type { REGIONAL_STYLES, CAMPAIGN_STYLES } from '@/lib/constants';

import { ScrollReactiveBackground } from '@/components/onboarding/ScrollReactiveBackground';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { Step1Welcome } from '@/components/onboarding/Step1Welcome';
import { Step2BusinessType } from '@/components/onboarding/Step2BusinessType';
import { Step3Location } from '@/components/onboarding/Step3Location';
import { Step4Contact } from '@/components/onboarding/Step4Contact';
import { Step5Marketing } from '@/components/onboarding/Step5Marketing';
import { Step7Review } from '@/components/onboarding/Step7Review';
import { Step8Completion } from '@/components/onboarding/Step8Completion';

import type { OnboardingFormData, StepErrors } from '@/components/onboarding/types';

export default function OnboardingPage() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax mouse position & scroll velocity state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollVelocity, setScrollVelocity] = useState(0);

  // Form State
  const [form, setForm] = useState<OnboardingFormData>({
    name: '',
    category: 'restaurant',
    description: undefined,
    city: '',
    state: '',
    locality: undefined,
    address: undefined,
    pincode: undefined,
    phone: '',
    whatsapp: '',
    email: undefined,
    dining: 'dine-in',
    businessHours: {
      openDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      openTime: '09:00',
      closeTime: '22:00',
      open7Days: true,
    },
    services: [],
    packages: [],
    bookingChannel: 'whatsapp',
    properties: [],
    language: 'en',
    goals: ['Get more customers', 'Promote special offers'],
    regionalStyle: 'neutral',
    contentStyle: 'funny',
  });

  const isSalon = form.category === 'salon';
  const isRealEstate = form.category === 'real_estate';
  const hasExtraStep = isSalon || isRealEstate;

  const servicesStepNumber = 4;
  const marketingStepNumber = hasExtraStep ? 5 : 4;
  const reviewStepNumber = hasExtraStep ? 6 : 5;
  const totalSteps = hasExtraStep ? 6 : 5;

  const [errors, setErrors] = useState<StepErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Ambient mouse & scroll physics listeners
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let ticking = false;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 16;
      const y = (e.clientY / innerHeight - 0.5) * 16;
      setMousePos({ x, y });
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const delta = window.scrollY - lastScrollY;
          lastScrollY = window.scrollY;
          setScrollVelocity(Math.min(Math.max(delta, -15), 15));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Redirect if user already completed onboarding
  useEffect(() => {
    if (user) {
      const loadExisting = async () => {
        try {
          const businesses = await businessService.getByUserId(user.uid);
          if (businesses.length > 0) {
            const existing = businesses[0];
            if (existing?.status !== 'archived' && existing?.category) {
              setStep(100);
              return;
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      void loadExisting();
    }
  }, [user]);

  // Handle Step Validation & Advancement
  const handleStepValidation = (currentStepNum: number) => {
    const newErrors: StepErrors = {};

    if (currentStepNum === 1) {
      if (!form.name.trim()) {
        newErrors.name = 'Business name is required';
      }
      if (!form.category) {
        newErrors.category = 'Business type is required';
      }
    } else if (currentStepNum === 2) {
      if (!form.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!form.state.trim()) {
        newErrors.state = 'State is required';
      }
    } else if (currentStepNum === 3) {
      if (!form.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
      if (!form.whatsapp.trim()) {
        newErrors.whatsapp = 'WhatsApp number is required';
      }
    } else if (isSalon && currentStepNum === servicesStepNumber) {
      const validServices = form.services.filter((s) => s.name.trim() && s.price.trim());
      if (validServices.length === 0) {
        newErrors.services = 'Add at least one service with a name and price';
      }
    } else if (isRealEstate && currentStepNum === servicesStepNumber) {
      const validProperties = form.properties.filter((p) => p.title.trim() && p.price.trim());
      if (validProperties.length === 0) {
        newErrors.properties = 'Add at least one property with a title and price';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!handleStepValidation(step)) return;
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSaving(true);

    try {
      await callFunction<
        {
          name: string;
          category: 'restaurant' | 'salon' | 'real_estate' | 'general';
          description?: string;
          location: { city: string; state: string; locality?: string; address?: string };
          contact: { phone: string; whatsapp: string };
          operatingMode?: 'dine-in' | 'takeaway' | 'delivery';
          services?: Array<{
            id: string;
            name: string;
            category:
              'hair' | 'skin' | 'nails' | 'makeup' | 'bridal' | 'spa' | 'grooming' | 'other';
            price: number;
            active: boolean;
          }>;
          packages?: Array<{ id: string; name: string; packagePrice: number; active: boolean }>;
          appointmentSettings?: {
            acceptInquiries: boolean;
            preferredBookingChannel: 'whatsapp' | 'phone' | 'in_person';
          };
          properties?: Array<{
            id: string;
            title: string;
            propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'other';
            areaSqft?: number;
            bedrooms?: number;
            bathrooms?: number;
            price: number;
            possessionStatus: 'ready_to_move' | 'under_construction' | 'upcoming';
            active: boolean;
          }>;
          language: 'en' | 'te' | 'hi' | 'ta' | 'te_en' | 'hi_en';
          regionalStyle: (typeof REGIONAL_STYLES)[number]['value'];
          contentStyle: (typeof CAMPAIGN_STYLES)[number]['value'];
        },
        { businessId: string }
      >({
        functionName: 'createBusiness',
        data: {
          name: form.name.trim(),
          category: form.category === 'other' ? 'general' : form.category,
          description: form.description?.trim() || undefined,
          location: {
            city: form.city.trim(),
            state: form.state.trim(),
            locality: form.locality?.trim() || undefined,
            address: form.address?.trim() || undefined,
          },
          contact: {
            phone: form.phone.trim(),
            whatsapp: form.whatsapp.trim(),
          },
          ...(isSalon
            ? {
                services: form.services
                  .filter((s) => s.name.trim() && s.price.trim())
                  .map((s, i) => ({
                    id: `svc_${i}`,
                    name: s.name.trim(),
                    category: s.category,
                    price: Number(s.price),
                    active: true,
                  })),
                packages: form.packages
                  .filter((p) => p.name.trim() && p.price.trim())
                  .map((p, i) => ({
                    id: `pkg_${i}`,
                    name: p.name.trim(),
                    packagePrice: Number(p.price),
                    active: true,
                  })),
                appointmentSettings: {
                  acceptInquiries: true,
                  preferredBookingChannel: form.bookingChannel,
                },
              }
            : isRealEstate
              ? {
                  properties: form.properties
                    .filter((p) => p.title.trim() && p.price.trim())
                    .map((p, i) => ({
                      id: `prop_${i}`,
                      title: p.title.trim(),
                      propertyType: p.propertyType,
                      areaSqft: p.areaSqft ? Number(p.areaSqft) : undefined,
                      bedrooms: p.bedrooms ? Number(p.bedrooms) : undefined,
                      bathrooms: p.bathrooms ? Number(p.bathrooms) : undefined,
                      price: Number(p.price),
                      possessionStatus: p.possessionStatus,
                      active: true,
                    })),
                }
              : { operatingMode: form.dining }),
          language: form.language,
          regionalStyle: form.regionalStyle as (typeof REGIONAL_STYLES)[number]['value'],
          contentStyle: form.contentStyle as (typeof CAMPAIGN_STYLES)[number]['value'],
        },
      });
      // createBusiness mints the businessIds custom claim server-side. The browser's current ID token
      // pre-dates it, so without a forced refresh the user's first product/asset writes are denied by
      // Firestore rules until they happen to sign out and in again.
      await getFirebaseAuth()
        ?.currentUser?.getIdToken(true)
        .catch((tokenError) => console.error('Token refresh after onboarding failed', tokenError));
      setStep(100);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setErrors((prev) => ({ ...prev, general: err.message }));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Completion Screen (Step 100)
  if (step === 100) {
    return (
      <ScrollReactiveBackground mousePos={mousePos} scrollVelocity={scrollVelocity}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
          <Step8Completion />
        </div>
      </ScrollReactiveBackground>
    );
  }

  return (
    <ScrollReactiveBackground mousePos={mousePos} scrollVelocity={scrollVelocity}>
      <div ref={containerRef} className="flex min-h-screen flex-col pb-12 font-sans">
        {/* Animated Progress Header */}
        <OnboardingProgress
          currentStep={step}
          totalSteps={totalSteps}
          onStepClick={(targetStep) => setStep(targetStep)}
        />

        {/* Main Content Area */}
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
          <motion.div
            key={step}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Step 1: Welcome Hero & Business Basics */}
            {step === 1 && (
              <div className="space-y-8">
                <Step1Welcome onNext={() => handleNext()} mousePos={mousePos} />

                <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-4">
                    <span className="text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
                      CHAPTER 1 — Business Identity
                    </span>
                    <h2 className="text-xl font-extrabold text-[#1A1A1E]">Business Basics</h2>
                    <p className="text-sm text-neutral-500">
                      Tell us about your business so we can set up your marketing correctly.
                    </p>
                  </div>

                  <form onSubmit={handleNext} className="space-y-5">
                    <div>
                      <label className="mb-1 block text-sm font-bold text-[#1A1A1E]">
                        Business Name *
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        type="text"
                        placeholder="e.g., Biryani House"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-xs font-bold text-red-600">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-[#1A1A1E]">
                        Business Type *
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {(['restaurant', 'salon', 'real_estate'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setForm({ ...form, category: cat })}
                            aria-pressed={form.category === cat}
                            className={`cursor-pointer rounded-2xl border p-4 text-left capitalize transition-all ${
                              form.category === cat
                                ? 'border-[#E84D1A] bg-orange-50/70 font-extrabold text-[#E84D1A] shadow-xs ring-2 ring-[#E84D1A]/20'
                                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                            }`}
                          >
                            <span className="block text-sm font-bold">
                              {cat === 'real_estate' ? 'Real Estate' : cat}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-normal text-neutral-500">
                              {cat === 'restaurant'
                                ? 'Food & Dining'
                                : cat === 'salon'
                                  ? 'Beauty & Wellness'
                                  : 'Listings & Brokerage'}
                            </span>
                          </button>
                        ))}
                      </div>
                      {errors.category && (
                        <p className="mt-1.5 text-xs font-bold text-red-600">{errors.category}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-[#1A1A1E]">
                        Short Tagline or Description (Optional)
                      </label>
                      <textarea
                        value={form.description || ''}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value || undefined })
                        }
                        rows={2}
                        placeholder="e.g., Authentic Dum Biryani since 2012"
                        className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#1A1A1E] transition-all outline-none placeholder:text-neutral-400 focus:border-[#E84D1A] focus:ring-2 focus:ring-[#E84D1A]/20"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-4">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-2xl border border-neutral-200 px-6 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="cursor-pointer rounded-2xl bg-[#E84D1A] px-8 py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-600/20 hover:bg-[#d03f10]"
                      >
                        Continue →
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <Step3Location
                form={form}
                setForm={setForm}
                errors={errors}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {/* Step 3: Contact & Operations */}
            {step === 3 && (
              <Step4Contact
                form={form}
                setForm={setForm}
                errors={errors}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {/* Step 4 (if salon/real estate): Services & Packages / Properties */}
            {hasExtraStep && step === servicesStepNumber && (
              <Step2BusinessType
                form={form}
                setForm={setForm}
                errors={errors}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {/* Marketing Preferences Step */}
            {step === marketingStepNumber && (
              <Step5Marketing
                form={form}
                setForm={setForm}
                errors={errors}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {/* Review Step */}
            {step === reviewStepNumber && (
              <Step7Review
                form={form}
                errors={errors}
                isSaving={isSaving}
                onSubmit={handleSubmit}
                onBack={handleBack}
                onJumpToStep={(target) => setStep(target)}
              />
            )}
          </motion.div>
        </main>
      </div>
    </ScrollReactiveBackground>
  );
}
