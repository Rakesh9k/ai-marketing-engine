'use client';

import { useState } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/services/api';

interface LocalizationSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'Telugu (తెలుగు)' },
  { value: 'hi', label: 'Hindi (हिंदी)' },
  { value: 'te_en', label: 'Tanglish / Telugu + English Mix' },
  { value: 'hi_en', label: 'Hinglish / Hindi + English Mix' },
];

const REGIONAL_STYLES = [
  { value: 'neutral', label: 'Standard / Neutral' },
  { value: 'hyderabadi', label: 'Hyderabadi (Dekhani / Local Flavor)' },
  { value: 'telangana', label: 'Telangana Regional' },
  { value: 'mumbai', label: 'Mumbai / Bambaiya' },
  { value: 'bangalore', label: 'Bangalore Contemporary' },
  { value: 'delhi', label: 'Delhi Bold' },
  { value: 'chennai', label: 'Chennai Local' },
  { value: 'kolkata', label: 'Kolkata Classic' },
];

const SLANG_LEVELS = [
  { value: 'none', label: 'Clean / Formal (No Slang)' },
  { value: 'light', label: 'Light Local Touch' },
  { value: 'moderate', label: 'Moderate & Authentic' },
  { value: 'heavy', label: 'Heavy Local Dialect' },
];

export function LocalizationSection({ business, onSaved, onCancel }: LocalizationSectionProps) {
  const loc = business.businessBrain?.localization || {
    primaryLanguage: 'en',
    secondaryLanguage: 'te',
    regionalStyle: 'hyderabadi',
    slangIntensity: 'light',
    languageMixing: 'natural',
  };

  const [primaryLanguage, setPrimaryLanguage] = useState<any>(loc.primaryLanguage || 'en');
  const [secondaryLanguage, setSecondaryLanguage] = useState<any>(loc.secondaryLanguage || 'te');
  const [regionalStyle, setRegionalStyle] = useState<any>(loc.regionalStyle || 'hyderabadi');
  const [slangIntensity, setSlangIntensity] = useState<any>(loc.slangIntensity || 'light');
  const [languageMixing, setLanguageMixing] = useState<any>(loc.languageMixing || 'natural');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(null);

    try {
      const updatedLoc = {
        primaryLanguage,
        secondaryLanguage,
        regionalStyle,
        slangIntensity,
        languageMixing,
      };

      await callFunction({
        functionName: 'updateBusinessBrain',
        data: {
          businessId: business.businessId,
          localization: updatedLoc,
        },
      });

      onSaved({
        businessBrain: {
          ...business.businessBrain,
          localization: updatedLoc,
        } as any,
      });

      setSavedNotice('Localization & Cultural Dialect settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save localization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Localization & Cultural Dialect</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Configure how Mitra handles local language mixing, regional slang, and cultural nuances.
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Primary Language</label>
            <select
              value={primaryLanguage}
              onChange={(e) => setPrimaryLanguage(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Secondary / Fallback Language</label>
            <select
              value={secondaryLanguage}
              onChange={(e) => setSecondaryLanguage(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Regional Dialect / Style</label>
            <select
              value={regionalStyle}
              onChange={(e) => setRegionalStyle(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            >
              {REGIONAL_STYLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Slang Intensity</label>
            <select
              value={slangIntensity}
              onChange={(e) => setSlangIntensity(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            >
              {SLANG_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
          {saving ? 'Saving...' : 'Save Localization'}
        </Button>
      </div>
    </form>
  );
}
