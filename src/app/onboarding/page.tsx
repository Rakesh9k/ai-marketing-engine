'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';

import { Button } from '@/components/ui/Button';

import { REGIONAL_STYLES, CAMPAIGN_STYLES } from '@/lib/constants';

function OnboardingPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<{
    name: string;
    category: 'restaurant';
    description?: string;
    city: string;
    state: string;
    locality?: string;
    address?: string;
    phone: string;
    whatsapp: string;
    dining: 'dine-in' | 'takeaway' | 'delivery';
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
    language: 'en',
    regionalStyle: 'neutral',
    contentStyle: 'funny',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    category?: string;
    city?: string;
    state?: string;
    phone?: string;
    whatsapp?: string;
    dining?: string;
    language?: string;
    regionalStyle?: string;
    contentStyle?: string;
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
    switch (step) {
      case 1:
        if (!form.name.trim()) {
          setErrors((prev) => ({ ...prev, name: 'Business name is required' }));
          isValid = false;
        }
        if (!form.category) {
          setErrors((prev) => ({ ...prev, category: 'Business type is required' }));
          isValid = false;
        }
        break;
      case 2:
        if (!form.city.trim()) {
          setErrors((prev) => ({ ...prev, city: 'City is required' }));
          isValid = false;
        }
        if (!form.state.trim()) {
          setErrors((prev) => ({ ...prev, state: 'State is required' }));
          isValid = false;
        }
        break;
      case 3:
        if (!form.phone.trim()) {
          setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
          isValid = false;
        }
        if (!form.whatsapp.trim()) {
          setErrors((prev) => ({ ...prev, whatsapp: 'WhatsApp number is required' }));
          isValid = false;
        }
        break;
      case 4:
        // Language and content style are optional but validated if provided
        break;
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
      // Build the validated object matching the Business schema
      const validated: any = {
        businessId: '',
        userId: user!.uid,
        agencyId: undefined,
        name: form.name.trim(),
        category: form.category,
        description: form.description?.trim(),
        location: {
          city: form.city.trim(),
          state: form.state.trim(),
          locality: form.locality?.trim(),
          address: form.address?.trim(),
        },
        contact: {
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
          website: '',
          instagram: '',
        },
        businessBrain: {
          identity: {
            name: form.name.trim(),
            category: form.category,
            description: form.description?.trim() || '',
          },
          location: {
            city: form.city.trim(),
            state: form.state.trim(),
            locality: form.locality?.trim(),
            address: form.address?.trim(),
          },
          contact: {
            phone: form.phone.trim(),
            whatsapp: form.whatsapp.trim(),
          },
          settings: {
            timezone: 'Asia/Kolkata',
            currency: 'INR',
          },
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        status: 'active',
      };

      await businessService.create(validated);
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
      <div className="bg-bg-primary min-h-screen">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Business Setup Complete</h1>
            <p className="mt-1 text-neutral-500">
              Your restaurant business has been setup successfully!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard">
              <Button>Go to Dashboard</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="text-brand-600 flex items-center gap-2 text-xl font-bold">
              <svg
                className="h-8 w-8"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="8" fill="currentColor" />
                <path
                  d="M8 16L14 22L24 10"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              AI Marketing Engine
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div
                  className={`h-8 w-8 rounded-full border-2 ${step >= 1 ? 'border-brand-600' : 'border-neutral-300'} bg-brand-600 ${step >= 1 ? 'text-white' : 'text-neutral-300'} flex items-center justify-center text-xs font-bold`}
                >
                  1
                </div>
                <div className="bg-brand-600 ${step > 1 ? 'opacity-100' : 'opacity-0'} h-1 w-1 rounded-full"></div>
                <div
                  className={`h-8 w-8 rounded-full border-2 ${step >= 2 ? 'border-brand-600' : 'border-neutral-300'} bg-brand-600 ${step >= 2 ? 'text-white' : 'text-neutral-300'} flex items-center justify-center text-xs font-bold`}
                >
                  2
                </div>
                <div className="bg-brand-600 ${step > 2 ? 'opacity-100' : 'opacity-0'} h-1 w-1 rounded-full"></div>
                <div
                  className={`h-8 w-8 rounded-full border-2 ${step >= 3 ? 'border-brand-600' : 'border-neutral-300'} bg-brand-600 ${step >= 3 ? 'text-white' : 'text-neutral-300'} flex items-center justify-center text-xs font-bold`}
                >
                  3
                </div>
                <div className="bg-brand-600 ${step > 3 ? 'opacity-100' : 'opacity-0'} h-1 w-1 rounded-full"></div>
                <div
                  className={`h-8 w-8 rounded-full border-2 ${step >= 4 ? 'border-brand-600' : 'border-neutral-300'} bg-brand-600 ${step >= 4 ? 'text-white' : 'text-neutral-300'} flex items-center justify-center text-xs font-bold`}
                >
                  4
                </div>
                <div className="bg-brand-600 ${step > 4 ? 'opacity-100' : 'opacity-0'} h-1 w-1 rounded-full"></div>
                <div
                  className={`h-8 w-8 rounded-full border-2 ${step >= 5 ? 'border-brand-600' : 'border-neutral-300'} bg-brand-600 ${step >= 5 ? 'text-white' : 'text-neutral-300'} flex items-center justify-center text-xs font-bold`}
                >
                  5
                </div>
              </div>
              <div className="text-sm text-neutral-500">Step {step} of 5</div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
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
                    <p className="text-brand-600 mt-1 text-sm font-medium">Restaurant</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Only restaurants are supported in the MVP. Other verticals coming soon.
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

            {step === 4 && (
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

            {step === 5 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-neutral-900">Review Your Business</h2>
                <p className="mb-8 text-neutral-500">
                  Please verify the information is correct before submitting.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-neutral-900">Business</p>
                    <p>{form.name}</p>
                    <p className="text-sm text-neutral-500">{form.category}</p>
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

                  <div>
                    <p className="font-medium text-neutral-900">Operations</p>
                    <p>{form.dining}</p>
                  </div>

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
                    Operations: {form.dining}
                    <br />
                    Language: {form.language}
                  </p>
                </div>

                <div className="mt-6">
                  <button type="button" onClick={handleBack} disabled={isSaving}>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSaving || Object.keys(errors).length > 0}
                  >
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
