'use client';

import { useState } from 'react';
import type { BrandKit } from '@/types';
import { Button } from '@/components/ui/Button';
import { brandKitService } from '@/services/database';

interface BrandProfileSectionProps {
  businessId: string;
  brandKit: BrandKit | null;
  onSaved: (updated: BrandKit) => void;
  onCancel?: () => void;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional & Authoritative' },
  { value: 'friendly', label: 'Warm, Friendly & Approachable' },
  { value: 'premium', label: 'Premium & Sophisticated' },
  { value: 'modern', label: 'Modern & Trendy' },
  { value: 'traditional', label: 'Authentic & Traditional' },
  { value: 'luxury', label: 'High-End Luxury' },
  { value: 'casual', label: 'Casual & Conversational' },
  { value: 'bold', label: 'Bold & High-Energy' },
];

export function BrandProfileSection({ businessId, brandKit, onSaved, onCancel }: BrandProfileSectionProps) {
  const [tone, setTone] = useState<any>(brandKit?.tone || 'friendly');
  const [personality, setPersonality] = useState(brandKit?.personality || '');
  const [visualPreferences, setVisualPreferences] = useState(brandKit?.visualPreferences || '');
  const [targetAudience, setTargetAudience] = useState(brandKit?.targetAudience || '');

  const [colorPrimary, setColorPrimary] = useState(brandKit?.colors?.primary || '#E84D1A');
  const [colorSecondary, setColorSecondary] = useState(brandKit?.colors?.secondary || '#1F2126');
  const [colorAccent, setColorAccent] = useState(brandKit?.colors?.accent || '#FFD700');
  
  const [fontHeading, setFontHeading] = useState(brandKit?.fonts?.heading || 'Montserrat');
  const [fontBody, setFontBody] = useState(brandKit?.fonts?.body || 'Inter');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(null);

    try {
      const updatedKit: BrandKit = {
        businessId,
        tone,
        personality: personality || undefined,
        visualPreferences: visualPreferences || undefined,
        targetAudience: targetAudience || undefined,
        colors: {
          primary: colorPrimary,
          secondary: colorSecondary,
          accent: colorAccent,
          text: '#111827',
          background: '#FFFFFF',
        },
        fonts: {
          heading: fontHeading,
          body: fontBody,
        },
        logo: brandKit?.logo,
        updatedAt: new Date().toISOString(),
      };

      await brandKitService.upsert(updatedKit);
      onSaved(updatedKit);
      setSavedNotice('Brand Profile & Design Guidelines saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Brand Profile & Design Identity</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Define how Mitra talks, looks, and feels across social posters, ads, videos, and captions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200" role="alert">
          {error}
        </div>
      )}

      {savedNotice && (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
          ✓ {savedNotice}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Brand Tone of Voice</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Brand Personality Keywords</label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={2}
            placeholder="e.g. Welcoming, passionate about spice perfection, family-oriented, authentic"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Visual Style Preferences</label>
          <textarea
            value={visualPreferences}
            onChange={(e) => setVisualPreferences(e.target.value)}
            rows={2}
            placeholder="e.g. Rich dark backgrounds, glowing spices, vibrant food photography, royal golden accents"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Brand Target Audience Notes</label>
          <textarea
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={2}
            placeholder="e.g. Families, young professionals, biryani foodies"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-neutral-700">Brand Colors</label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="mb-1 block text-xs font-semibold text-neutral-500">Primary Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-neutral-300 p-1"
                />
                <input
                  type="text"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase text-neutral-900"
                />
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold text-neutral-500">Secondary Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorSecondary}
                  onChange={(e) => setColorSecondary(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-neutral-300 p-1"
                />
                <input
                  type="text"
                  value={colorSecondary}
                  onChange={(e) => setColorSecondary(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase text-neutral-900"
                />
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold text-neutral-500">Accent Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorAccent}
                  onChange={(e) => setColorAccent(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-neutral-300 p-1"
                />
                <input
                  type="text"
                  value={colorAccent}
                  onChange={(e) => setColorAccent(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase text-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Heading Font</label>
            <input
              value={fontHeading}
              onChange={(e) => setFontHeading(e.target.value)}
              placeholder="e.g. Montserrat"
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Body Font</label>
            <input
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value)}
              placeholder="e.g. Inter"
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Brand Profile'}
        </Button>
      </div>
    </form>
  );
}
