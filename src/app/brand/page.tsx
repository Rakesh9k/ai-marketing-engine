'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, brandKitService } from '@/services/database';
import type { Business, BrandKit, BrandTone } from '@/types';

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-neutral-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="focus:ring-brand-500 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          placeholder="#RRGGBB"
        />
      </div>
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const fonts = [
    'Inter',
    'Poppins',
    'Roboto',
    'Open Sans',
    'Montserrat',
    'Lato',
    'Nunito',
    'Raleway',
    'Merriweather',
    'Playfair Display',
    'Oswald',
    'Source Sans Pro',
    'Ubuntu',
    'PT Sans',
  ];
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
      >
        {fonts.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const tones = [
    'professional',
    'friendly',
    'premium',
    'traditional',
    'modern',
    'luxury',
    'casual',
    'bold',
  ];
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700">Brand Tone</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
      >
        {tones.map((tone) => (
          <option key={tone} value={tone}>
            {tone.charAt(0).toUpperCase() + tone.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-neutral-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

function BrandKitForm({
  initialData,
  onSubmit,
  loading,
}: {
  initialData: BrandKit | null;
  onSubmit: (data: Partial<BrandKit>) => Promise<void>;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<BrandKit>>({
    colors: {
      primary: '#E84D1A',
      secondary: '#FFFFFF',
      accent: '#FFD700',
      background: '#FFFFFF',
      text: '#1A1A1A',
    },
    fonts: { heading: 'Poppins', body: 'Inter' },
    tone: 'friendly' as BrandTone,
    personality: '',
    visualPreferences: '',
    targetAudience: '',
    logo: initialData?.logo,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Logo</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Primary Logo</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setFormData((prev) => ({
                        ...prev,
                        logo: {
                          ...prev.logo,
                          primary: {
                            url: event.target?.result as string,
                            storagePath: '',
                            width: 0,
                            height: 0,
                          },
                        },
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Secondary Logo (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setFormData((prev) => ({
                      ...prev,
                      logo: {
                        ...prev.logo,
                        secondary: {
                          url: event.target?.result as string,
                          storagePath: '',
                          width: 0,
                          height: 0,
                        },
                      },
                    }));
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Colors</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ColorInput
            label="Primary"
            value={formData.colors?.primary || '#E84D1A'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, colors: { ...prev.colors!, primary: v } }))
            }
          />
          <ColorInput
            label="Secondary"
            value={formData.colors?.secondary || '#FFFFFF'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, colors: { ...prev.colors!, secondary: v } }))
            }
          />
          <ColorInput
            label="Accent"
            value={formData.colors?.accent || '#FFD700'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, colors: { ...prev.colors!, accent: v } }))
            }
          />
          <ColorInput
            label="Background"
            value={formData.colors?.background || '#FFFFFF'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, colors: { ...prev.colors!, background: v } }))
            }
          />
          <ColorInput
            label="Text"
            value={formData.colors?.text || '#1A1A1A'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, colors: { ...prev.colors!, text: v } }))
            }
          />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Typography</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FontSelect
            label="Heading Font"
            value={formData.fonts?.heading || 'Poppins'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, fonts: { ...prev.fonts!, heading: v } }))
            }
          />
          <FontSelect
            label="Body Font"
            value={formData.fonts?.body || 'Inter'}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, fonts: { ...prev.fonts!, body: v } }))
            }
          />
        </div>
      </div>

      <ToneSelect
        value={formData.tone || 'friendly'}
        onChange={(v) => setFormData((prev) => ({ ...prev, tone: v as BrandTone }))}
      />

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Brand Personality</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Personality</label>
            <textarea
              value={formData.personality || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, personality: e.target.value }))}
              rows={3}
              className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
              placeholder="Describe your brand's personality (e.g., warm, energetic, trustworthy)"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Visual Preferences
            </label>
            <textarea
              value={formData.visualPreferences || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, visualPreferences: e.target.value }))
              }
              rows={2}
              className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
              placeholder="e.g., minimal, photographic, warm lighting"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Target Audience
            </label>
            <textarea
              value={formData.targetAudience || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, targetAudience: e.target.value }))}
              rows={2}
              className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
              placeholder="Describe your ideal customer"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Brand Kit'}
        </button>
      </div>
    </form>
  );
}
export default function BrandPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBusinesses() {
      if (!user) return;
      try {
        const businessesData = await businessService.getByUserId(user.uid);
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          const firstBusiness = businessesData[0]!;
          setSelectedBusinessId(firstBusiness.businessId);
        }
      } catch (err) {
        console.error(err);
      }
    }
    void loadBusinesses();
  }, [user]);

  useEffect(() => {
    if (selectedBusinessId) {
      const businessId = selectedBusinessId;
      async function loadBrandKit() {
        try {
          setLoading(true);
          const brandKitData = await brandKitService.get(businessId);
          setBrandKit(brandKitData ?? null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
      void loadBrandKit();
    }
  }, [selectedBusinessId]);

  const handleSubmit = async (data: Partial<BrandKit>) => {
    if (!selectedBusinessId) return;
    try {
      setSaving(true);
      await brandKitService.upsert({ businessId: selectedBusinessId, ...data } as BrandKit);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const __handleSelectBusiness = (_businessId: string) => {
    // Handler kept for future use
  };
  void __handleSelectBusiness;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Brand Kit</h1>
            <p className="mt-1 text-neutral-500">
              Configure your brand's visual identity and voice
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedBusinessId || ''}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none sm:w-64"
              aria-label="Select business"
            >
              {businesses.map((business) => (
                <option key={business.businessId} value={business.businessId}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {businesses.length === 0 ? (
        <EmptyState
          title="No business set up yet"
          description="Create your first business to configure your brand kit"
          action={
            <a href="/onboarding">
              <button className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Business
              </button>
            </a>
          }
        />
      ) : (
        <div className="mx-auto max-w-4xl">
          <BrandKitForm initialData={brandKit} onSubmit={handleSubmit} loading={saving} />
        </div>
      )}
    </div>
  );
}
