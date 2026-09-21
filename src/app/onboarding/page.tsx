'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';
import { callFunction } from '@/services/api';

import { Button } from '@/components/ui/Button';
import { MitraMark } from '@/components/ui/MitraMark';
import { MascotScene } from '@/components/mascot/MascotScene';
import { SparkIllustration } from '@/components/illustrations/Illustrations';

import { REGIONAL_STYLES, CAMPAIGN_STYLES } from '@/lib/constants';

interface OnboardingService {
  name: string;
  category: 'hair' | 'skin' | 'nails' | 'makeup' | 'bridal' | 'spa' | 'grooming' | 'other';
  price: string;
}

interface OnboardingPackage {
  name: string;
  price: string;
}

interface OnboardingProperty {
  title: string;
  propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'other';
  areaSqft: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  possessionStatus: 'ready_to_move' | 'under_construction' | 'upcoming';
}

function OnboardingPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<{
    name: string;
    category: 'restaurant' | 'salon' | 'real_estate';
    description?: string;
    city: string;
    state: string;
    locality?: string;
    address?: string;
    phone: string;
    whatsapp: string;
    dining: 'dine-in' | 'takeaway' | 'delivery';
    // Salon-only (Phase 30) — ignored entirely when category isn't 'salon'.
    services: OnboardingService[];
    packages: OnboardingPackage[];
    bookingChannel: 'whatsapp' | 'phone' | 'in_person';
    // Real-estate-only (Phase 31) — ignored entirely when category isn't 'real_estate'.
    properties: OnboardingProperty[];
    language: 'en' | 'te' | 'hi' | 'te_en' | 'hi_en';
    regionalStyle: (typeof REGIONAL_STYLES)[number]['value'];
    contentStyle: (typeof CAMPAIGN_STYLES)[number]['value'];
  }>({
    name: '',
    category: 'restaurant',
    description: undefined,
    city: '',
    state: '',
    locality: undefined,
    address: undefined,
    phone: '',
    whatsapp: '',
    dining: 'dine-in',
    services: [],
    packages: [],
    bookingChannel: 'whatsapp',
    properties: [],
    language: 'en',
    regionalStyle: 'neutral',
    contentStyle: 'funny',
  });
  const isSalon = form.category === 'salon';
  const isRealEstate = form.category === 'real_estate';
  // Salon and real estate each insert one extra step (Services & Packages,
  // or Properties) between Contact and Marketing Preferences — never both
  // at once, since a business is exactly one category. Restaurant's step
  // count and shape are completely unaffected either way.
  const hasExtraStep = isSalon || isRealEstate;
  const totalSteps = hasExtraStep ? 6 : 5;
  const servicesStepNumber = 4;
  const marketingStepNumber = hasExtraStep ? 5 : 4;
  const reviewStepNumber = hasExtraStep ? 6 : 5;
  const [errors, setErrors] = useState<{
    name?: string;
    category?: string;
    city?: string;
    state?: string;
    phone?: string;
    whatsapp?: string;
    dining?: string;
    services?: string;
    properties?: string;
    language?: string;
    regionalStyle?: string;
    contentStyle?: string;
    general?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const loadExisting = async () => {
        try {
          const businesses = await businessService.getByUserId(user.uid);
          if (businesses.length > 0) {
            const existing = businesses.length > 0 ? businesses[0] : undefined;
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

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    let isValid = true;
    if (step === 1) {
      if (!form.name.trim()) {
        setErrors((prev) => ({ ...prev, name: 'Business name is required' }));
        isValid = false;
      }
      if (!form.category) {
        setErrors((prev) => ({ ...prev, category: 'Business type is required' }));
        isValid = false;
      }
    } else if (step === 2) {
      if (!form.city.trim()) {
        setErrors((prev) => ({ ...prev, city: 'City is required' }));
        isValid = false;
      }
      if (!form.state.trim()) {
        setErrors((prev) => ({ ...prev, state: 'State is required' }));
        isValid = false;
      }
    } else if (step === 3) {
      if (!form.phone.trim()) {
        setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
        isValid = false;
      }
      if (!form.whatsapp.trim()) {
        setErrors((prev) => ({ ...prev, whatsapp: 'WhatsApp number is required' }));
        isValid = false;
      }
    } else if (isSalon && step === servicesStepNumber) {
      const validServices = form.services.filter((s) => s.name.trim() && s.price.trim());
      if (validServices.length === 0) {
        setErrors((prev) => ({
          ...prev,
          services: 'Add at least one service with a name and price',
        }));
        isValid = false;
      }
    } else if (isRealEstate && step === servicesStepNumber) {
      const validProperties = form.properties.filter((p) => p.title.trim() && p.price.trim());
      if (validProperties.length === 0) {
        setErrors((prev) => ({
          ...prev,
          properties: 'Add at least one property with a title and price',
        }));
        isValid = false;
      }
    } else if (step === marketingStepNumber) {
      // Language and content style are optional but validated if provided
    }

    if (!isValid) return;
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
          category: 'restaurant' | 'salon' | 'real_estate';
          description?: string;
          location: { city: string; state: string; locality?: string; address?: string };
          contact: { phone: string; whatsapp: string };
          operatingMode?: 'dine-in' | 'takeaway' | 'delivery';
          services?: Array<{
            id: string;
            name: string;
            category: OnboardingService['category'];
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
            propertyType: OnboardingProperty['propertyType'];
            areaSqft?: number;
            bedrooms?: number;
            bathrooms?: number;
            price: number;
            possessionStatus: OnboardingProperty['possessionStatus'];
            active: boolean;
          }>;
          language: 'en' | 'te' | 'hi' | 'te_en' | 'hi_en';
          regionalStyle: (typeof REGIONAL_STYLES)[number]['value'];
          contentStyle: (typeof CAMPAIGN_STYLES)[number]['value'];
        },
        { businessId: string }
      >({
        functionName: 'createBusiness',
        data: {
          name: form.name.trim(),
          category: form.category,
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
          regionalStyle: form.regionalStyle,
          contentStyle: form.contentStyle,
        },
      });
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

  if (step === 100) {
    return (
      <div className="bg-bg-primary flex min-h-screen items-center justify-center p-8">
        <MascotScene
          pose="cheer"
          size="lg"
          align="center"
          message="Your business is set up."
          supporting="Let's create your first campaign."
        >
          <a href="/dashboard" className="mt-4 inline-block">
            <Button>Go to Dashboard</Button>
          </a>
        </MascotScene>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="text-brand-600 flex items-center gap-2 text-xl font-bold">
              <MitraMark size="lg" decorative />
              AI Marketing Engine
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-full border-2 ${step >= n ? 'border-brand-600' : 'border-neutral-300'} bg-brand-600 ${step >= n ? 'text-white' : 'text-neutral-300'} flex items-center justify-center text-xs font-bold`}
                    >
                      {n}
                    </div>
                    {n < totalSteps && (
                      <div
                        className={`bg-brand-600 h-1 w-1 rounded-full ${step > n ? 'opacity-100' : 'opacity-0'}`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-sm text-neutral-500">
                Step {step} of {totalSteps}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {step === 1 && (
              <MascotScene
                pose="point"
                size="lg"
                message="Hey, I'm Mitra."
                supporting="Let's turn your business into marketing you can actually use."
                decoration={<SparkIllustration size={16} />}
                className="mb-6"
              />
            )}
            {step === 1 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Business Basics</h2>
                <p className="mb-4 text-neutral-500">
                  Tell us about your business so we can set up your marketing correctly.
                </p>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Business Name *
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      type="text"
                      required
                      placeholder="e.g., Biryani House"
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                    {errors.name && <p className="text-error-600 mt-1 text-sm">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Business Type *
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      {(['restaurant', 'salon', 'real_estate'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setForm({ ...form, category: cat })}
                          aria-pressed={form.category === cat}
                          className={`rounded-lg border p-3 text-left capitalize transition-colors ${
                            form.category === cat
                              ? 'border-brand-600 bg-brand-50 text-brand-600 font-medium'
                              : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {cat === 'real_estate' ? 'Real Estate' : cat}
                        </button>
                      ))}
                    </div>
                    {errors.category && (
                      <p className="text-error-600 mt-1 text-sm">{errors.category}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={handleBack} className="flex-1">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={Object.keys(errors).length > 0}
                      className="flex-1"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 2 && (
              <MascotScene
                pose="curious"
                size="sm"
                message="Where are you based?"
                className="mb-4"
              />
            )}
            {step === 2 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Location</h2>
                <p className="mb-4 text-neutral-500">
                  Your location helps us target customers in your area.
                </p>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">City *</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      type="text"
                      required
                      placeholder="e.g., Hyderabad"
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                    {errors.city && <p className="text-error-600 mt-1 text-sm">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">State *</label>
                    <input
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      type="text"
                      required
                      placeholder="e.g., Telangana"
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                    {errors.state && <p className="text-error-600 mt-1 text-sm">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Locality / Area (Optional)
                    </label>
                    <input
                      value={form.locality || ''}
                      onChange={(e) => setForm({ ...form, locality: e.target.value || undefined })}
                      type="text"
                      placeholder="e.g., Kondapur"
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={handleBack} className="flex-1">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={Object.keys(errors).length > 0}
                      className="flex-1"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Contact & Operations</h2>
                <p className="mb-4 text-neutral-500">
                  How customers can reach you and what services you offer.
                </p>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Phone Number *
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      type="tel"
                      required
                      placeholder="e.g., +91 98765 43210"
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                    {errors.phone && <p className="text-error-600 mt-1 text-sm">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      WhatsApp Number *
                    </label>
                    <input
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      type="tel"
                      required
                      placeholder="e.g., +91 98765 43210"
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                    {errors.whatsapp && (
                      <p className="text-error-600 mt-1 text-sm">{errors.whatsapp}</p>
                    )}
                  </div>

                  {!isSalon && !isRealEstate && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        How do customers buy from you? *
                      </label>
                      <select
                        value={form.dining}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dining: e.target.value as 'dine-in' | 'takeaway' | 'delivery',
                          })
                        }
                        className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      >
                        <option value="dine-in">Dine-in</option>
                        <option value="takeaway">Takeaway</option>
                        <option value="delivery">Delivery</option>
                      </select>
                      {errors.dining && (
                        <p className="text-error-600 mt-1 text-sm">{errors.dining}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={handleBack} className="flex-1">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={Object.keys(errors).length > 0}
                      className="flex-1"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isSalon && step === servicesStepNumber && (
              <MascotScene
                pose="remembering"
                size="sm"
                message="What services do you offer?"
                className="mb-4"
              />
            )}
            {isSalon && step === servicesStepNumber && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Services &amp; Packages</h2>
                <p className="mb-4 text-neutral-500">
                  Add the services you offer so Mitra can generate accurate campaigns. Packages are
                  optional.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">Services *</label>
                    <div className="mt-2 space-y-2">
                      {form.services.map((svc, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={svc.name}
                            onChange={(e) => {
                              const services = [...form.services];
                              services[i] = { ...services[i]!, name: e.target.value };
                              setForm({ ...form, services });
                            }}
                            type="text"
                            placeholder="e.g., Haircut & Styling"
                            className="focus:ring-brand-500 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                          />
                          <input
                            value={svc.price}
                            onChange={(e) => {
                              const services = [...form.services];
                              services[i] = { ...services[i]!, price: e.target.value };
                              setForm({ ...form, services });
                            }}
                            type="number"
                            min="0"
                            placeholder="Price (₹)"
                            className="focus:ring-brand-500 w-32 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                services: form.services.filter((_, idx) => idx !== i),
                              })
                            }
                            className="text-error-600 px-2 text-sm"
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
                        setForm({
                          ...form,
                          services: [...form.services, { name: '', category: 'other', price: '' }],
                        })
                      }
                      className="text-brand-600 mt-2 text-sm font-medium"
                    >
                      + Add a service
                    </button>
                    {errors.services && (
                      <p className="text-error-600 mt-1 text-sm">{errors.services}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Packages (Optional)
                    </label>
                    <div className="mt-2 space-y-2">
                      {form.packages.map((pkg, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={pkg.name}
                            onChange={(e) => {
                              const packages = [...form.packages];
                              packages[i] = { ...packages[i]!, name: e.target.value };
                              setForm({ ...form, packages });
                            }}
                            type="text"
                            placeholder="e.g., Bridal Package"
                            className="focus:ring-brand-500 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                          />
                          <input
                            value={pkg.price}
                            onChange={(e) => {
                              const packages = [...form.packages];
                              packages[i] = { ...packages[i]!, price: e.target.value };
                              setForm({ ...form, packages });
                            }}
                            type="number"
                            min="0"
                            placeholder="Price (₹)"
                            className="focus:ring-brand-500 w-32 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                packages: form.packages.filter((_, idx) => idx !== i),
                              })
                            }
                            className="text-error-600 px-2 text-sm"
                            aria-label="Remove package"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, packages: [...form.packages, { name: '', price: '' }] })
                      }
                      className="text-brand-600 mt-2 text-sm font-medium"
                    >
                      + Add a package
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Preferred booking channel
                    </label>
                    <select
                      value={form.bookingChannel}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bookingChannel: e.target.value as 'whatsapp' | 'phone' | 'in_person',
                        })
                      }
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">Phone call</option>
                      <option value="in_person">In person / walk-in</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={handleBack} className="flex-1">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={Object.keys(errors).length > 0}
                      className="flex-1"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isRealEstate && step === servicesStepNumber && (
              <MascotScene
                pose="remembering"
                size="sm"
                message="What are you listing?"
                className="mb-4"
              />
            )}
            {isRealEstate && step === servicesStepNumber && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Properties</h2>
                <p className="mb-4 text-neutral-500">
                  Add the properties or listings you want to market. Mitra will only use these exact
                  facts in your campaigns.
                </p>

                <div className="space-y-3">
                  {form.properties.map((prop, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 sm:grid-cols-3"
                    >
                      <input
                        value={prop.title}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = { ...properties[i]!, title: e.target.value };
                          setForm({ ...form, properties });
                        }}
                        type="text"
                        placeholder="e.g., 3BHK in Green Meadows"
                        className="focus:ring-brand-500 col-span-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none sm:col-span-3"
                      />
                      <select
                        value={prop.propertyType}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = {
                            ...properties[i]!,
                            propertyType: e.target.value as OnboardingProperty['propertyType'],
                          };
                          setForm({ ...form, properties });
                        }}
                        className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      >
                        <option value="apartment">Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="plot">Plot</option>
                        <option value="commercial">Commercial</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        value={prop.bedrooms}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = { ...properties[i]!, bedrooms: e.target.value };
                          setForm({ ...form, properties });
                        }}
                        type="number"
                        min="0"
                        placeholder="Bedrooms"
                        className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      />
                      <input
                        value={prop.bathrooms}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = { ...properties[i]!, bathrooms: e.target.value };
                          setForm({ ...form, properties });
                        }}
                        type="number"
                        min="0"
                        placeholder="Bathrooms"
                        className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      />
                      <input
                        value={prop.areaSqft}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = { ...properties[i]!, areaSqft: e.target.value };
                          setForm({ ...form, properties });
                        }}
                        type="number"
                        min="0"
                        placeholder="Area (sqft)"
                        className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      />
                      <input
                        value={prop.price}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = { ...properties[i]!, price: e.target.value };
                          setForm({ ...form, properties });
                        }}
                        type="number"
                        min="0"
                        placeholder="Price (₹)"
                        className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      />
                      <select
                        value={prop.possessionStatus}
                        onChange={(e) => {
                          const properties = [...form.properties];
                          properties[i] = {
                            ...properties[i]!,
                            possessionStatus: e.target
                              .value as OnboardingProperty['possessionStatus'],
                          };
                          setForm({ ...form, properties });
                        }}
                        className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                      >
                        <option value="ready_to_move">Ready to move</option>
                        <option value="under_construction">Under construction</option>
                        <option value="upcoming">Upcoming</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            properties: form.properties.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-error-600 col-span-2 text-left text-sm sm:col-span-3"
                        aria-label="Remove property"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      properties: [
                        ...form.properties,
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
                    })
                  }
                  className="text-brand-600 mt-3 text-sm font-medium"
                >
                  + Add a property
                </button>
                {errors.properties && (
                  <p className="text-error-600 mt-1 text-sm">{errors.properties}</p>
                )}

                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={handleBack} className="flex-1">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={Object.keys(errors).length > 0}
                    className="flex-1"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === marketingStepNumber && (
              <MascotScene
                pose="remembering"
                size="sm"
                message="Getting a feel for your style."
                className="mb-4"
              />
            )}
            {step === marketingStepNumber && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Marketing Preferences</h2>
                <p className="mb-4 text-neutral-500">
                  Help us generate marketing content that resonates with your audience.
                </p>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Preferred Language *
                    </label>
                    <select
                      value={form.language}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          language: e.target.value as 'en' | 'te' | 'hi' | 'te_en' | 'hi_en',
                        })
                      }
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="te">Telugu</option>
                      <option value="hi">Hindi</option>
                      <option value="te_en">Telugu-English</option>
                      <option value="hi_en">Hindi-English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Regional Style *
                    </label>
                    <select
                      value={form.regionalStyle}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          regionalStyle: e.target
                            .value as (typeof REGIONAL_STYLES)[number]['value'],
                        })
                      }
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    >
                      {REGIONAL_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-neutral-500">
                      How you'd like your content to sound locally
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Content Style *
                    </label>
                    <select
                      value={form.contentStyle}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contentStyle: e.target.value as (typeof CAMPAIGN_STYLES)[number]['value'],
                        })
                      }
                      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    >
                      {CAMPAIGN_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-neutral-500">
                      The creative approach for your campaigns
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={handleBack} className="flex-1">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={Object.keys(errors).length > 0}
                      className="flex-1"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === reviewStepNumber && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Review Your Business</h2>
                <p className="mb-8 text-neutral-500">
                  Please verify the information is correct before submitting.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-neutral-900">Business</p>
                    <p>{form.name}</p>
                    <p className="text-sm text-neutral-500 capitalize">{form.category}</p>
                    {form.description && (
                      <p className="text-sm text-neutral-500">{form.description}</p>
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-neutral-900">Location</p>
                    <p>
                      {form.locality || form.city}, {form.state}
                    </p>
                    {form.address && <p className="text-sm text-neutral-500">{form.address}</p>}
                  </div>

                  <div>
                    <p className="font-medium text-neutral-900">Contact</p>
                    <p>{form.phone}</p>
                    <p>{form.whatsapp}</p>
                  </div>

                  {isSalon ? (
                    <div>
                      <p className="font-medium text-neutral-900">Services</p>
                      {form.services.filter((s) => s.name.trim()).length === 0 ? (
                        <p className="text-sm text-neutral-500">No services added</p>
                      ) : (
                        form.services
                          .filter((s) => s.name.trim())
                          .map((s, i) => (
                            <p key={i} className="text-sm text-neutral-500">
                              {s.name} — ₹{s.price}
                            </p>
                          ))
                      )}
                      {form.packages.filter((p) => p.name.trim()).length > 0 && (
                        <>
                          <p className="mt-2 font-medium text-neutral-900">Packages</p>
                          {form.packages
                            .filter((p) => p.name.trim())
                            .map((p, i) => (
                              <p key={i} className="text-sm text-neutral-500">
                                {p.name} — ₹{p.price}
                              </p>
                            ))}
                        </>
                      )}
                      <p className="mt-2 text-sm text-neutral-500">
                        Booking via {form.bookingChannel.replace('_', ' ')}
                      </p>
                    </div>
                  ) : isRealEstate ? (
                    <div>
                      <p className="font-medium text-neutral-900">Properties</p>
                      {form.properties.filter((p) => p.title.trim()).length === 0 ? (
                        <p className="text-sm text-neutral-500">No properties added</p>
                      ) : (
                        form.properties
                          .filter((p) => p.title.trim())
                          .map((p, i) => (
                            <p key={i} className="text-sm text-neutral-500">
                              {p.title} — ₹{p.price} ({p.possessionStatus.replace(/_/g, ' ')})
                            </p>
                          ))
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-neutral-900">Operations</p>
                      <p>{form.dining}</p>
                    </div>
                  )}

                  <div>
                    <p className="font-medium text-neutral-900">Marketing</p>
                    <p>{form.language}</p>
                    {form.regionalStyle && (
                      <p className="text-sm text-neutral-500">{form.regionalStyle}</p>
                    )}
                    {form.contentStyle && (
                      <p className="text-sm text-neutral-500">{form.contentStyle}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="font-medium text-neutral-900">Summary</p>
                  <p className="mt-2 text-sm text-neutral-600">
                    Business: {form.name} ({form.category})<br />
                    Location: {form.locality || form.city}, {form.state}
                    <br />
                    Contact: {form.phone}
                    <br />
                    {isSalon
                      ? `Services: ${form.services.filter((s) => s.name.trim()).length}`
                      : isRealEstate
                        ? `Properties: ${form.properties.filter((p) => p.title.trim()).length}`
                        : `Operations: ${form.dining}`}
                    <br />
                    Language: {form.language}
                  </p>
                </div>

                {errors.general && <p className="text-error-600 mt-4 text-sm">{errors.general}</p>}

                <div className="mt-6">
                  <button type="button" onClick={handleBack} disabled={isSaving}>
                    Back
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Complete Setup'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
