'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, brandKitService } from '@/services/database';
import { callFunction } from '@/services/api';
import { uploadImage } from '@/features/asset/services/assetService';
import { useToast } from '@/hooks/useToast';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import type { Business, BrandKit, BrandTone } from '@/types';

const DEFAULT_BRAND_KIT_FIELDS = {
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
};

function toFormData(initialData: BrandKit | null): Partial<BrandKit> {
  return {
    ...DEFAULT_BRAND_KIT_FIELDS,
    ...initialData,
    colors: { ...DEFAULT_BRAND_KIT_FIELDS.colors, ...initialData?.colors },
    fonts: { ...DEFAULT_BRAND_KIT_FIELDS.fonts, ...initialData?.fonts },
  };
}

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
  userId,
  businessId,
}: {
  initialData: BrandKit | null;
  onSubmit: (data: Partial<BrandKit>) => Promise<void>;
  loading: boolean;
  userId: string;
  businessId: string;
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<BrandKit>>(() => toFormData(initialData));
  const [uploadingLogo, setUploadingLogo] = useState<'primary' | 'secondary' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await onSubmit(formData);
      showToast('Brand kit saved', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save brand kit';
      setSubmitError(message);
      showToast(message, 'error');
    }
  };

  const handleCancel = () => {
    setFormData(toFormData(initialData));
    setSubmitError(null);
  };

  const handleLogoSelect = async (slot: 'primary' | 'secondary', file: File) => {
    setUploadingLogo(slot);
    try {
      const asset = await uploadImage(file, userId, businessId, 'logo');
      setFormData((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          [slot]: {
            url: asset.previewUrl,
            storagePath: asset.storagePath,
            width: asset.width,
            height: asset.height,
          },
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logo upload failed';
      showToast(message, 'error');
    } finally {
      setUploadingLogo(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Logo</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Primary Logo</label>
            <div className="flex items-center gap-4">
              {formData.logo?.primary?.url && (
                // eslint-disable-next-line @next/next/no-img-element -- Storage/signed-URL preview
                <img
                  src={formData.logo.primary.url}
                  alt="Primary logo preview"
                  className="h-10 w-10 rounded border border-neutral-200 object-contain"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLogoSelect('primary', file);
                }}
                className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none disabled:opacity-50"
              />
              {uploadingLogo === 'primary' && (
                <span className="text-sm text-neutral-500">Uploading…</span>
              )}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Secondary Logo (optional)
            </label>
            <div className="flex items-center gap-4">
              {formData.logo?.secondary?.url && (
                // eslint-disable-next-line @next/next/no-img-element -- Storage/signed-URL preview
                <img
                  src={formData.logo.secondary.url}
                  alt="Secondary logo preview"
                  className="h-10 w-10 rounded border border-neutral-200 object-contain"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLogoSelect('secondary', file);
                }}
                className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none disabled:opacity-50"
              />
              {uploadingLogo === 'secondary' && (
                <span className="text-sm text-neutral-500">Uploading…</span>
              )}
            </div>
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

      {submitError && (
        <p className="text-error-600 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading || uploadingLogo !== null}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || uploadingLogo !== null}
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
        } else {
          // No business yet — there's nothing for the brand-kit effect below
          // to load (it only runs when selectedBusinessId is set), so this
          // was the one path that left `loading` stuck at `true` forever,
          // spinning instead of showing the "No business set up yet" state.
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
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
          setBrandKit(null);
        } finally {
          setLoading(false);
        }
      }
      void loadBrandKit();
    }
  }, [selectedBusinessId]);

  const handleSubmit = async (data: Partial<BrandKit>) => {
    if (!selectedBusinessId) return;
    setSaving(true);
    try {
      // Writes go through the validated callables (hex colours, tone enum),
      // not a direct client Firestore write — brand_kits is now
      // server-write-only (see firestore.rules). create vs update is
      // decided by whether a kit already exists for this business.
      const functionName = brandKit ? 'updateBrandKit' : 'createBrandKit';
      const result = await callFunction<Partial<BrandKit>, { brandKit: BrandKit }>({
        functionName,
        data: { businessId: selectedBusinessId, ...data },
      });
      setBrandKit(result.brandKit);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="form" />;
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
          <BrandKitForm
            // Remounts (and re-seeds formData from the new business's
            // brandKit) on business switch instead of carrying over the
            // previous business's draft/logo.
            key={selectedBusinessId}
            initialData={brandKit}
            onSubmit={handleSubmit}
            loading={saving}
            userId={user?.uid || ''}
            businessId={selectedBusinessId || ''}
          />
        </div>
      )}
    </div>
  );
}
