'use client';

import { useState, useEffect } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { callFunction } from '@/services/api';

interface AudienceSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

export function AudienceSection({ business, onSaved, onCancel }: AudienceSectionProps) {
  const initialAudience = business.businessBrain?.audience || {
    targetCustomer: '',
    ageRange: { min: 18, max: 55 },
    localities: [],
    preferences: '',
  };

  const [targetCustomer, setTargetCustomer] = useState(initialAudience.targetCustomer || '');
  const [minAge, setMinAge] = useState(initialAudience.ageRange?.min || 18);
  const [maxAge, setMaxAge] = useState(initialAudience.ageRange?.max || 55);
  const [localitiesText, setLocalitiesText] = useState(
    (initialAudience.localities || []).join(', ')
  );
  const [preferences, setPreferences] = useState(initialAudience.preferences || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const aud = business.businessBrain?.audience;
    setTargetCustomer(aud?.targetCustomer || '');
    setMinAge(aud?.ageRange?.min || 18);
    setMaxAge(aud?.ageRange?.max || 55);
    setLocalitiesText((aud?.localities || []).join(', '));
    setPreferences(aud?.preferences || '');
  }, [business.businessId, business.businessBrain?.audience]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(null);

    const localities = localitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const newAudience = {
        targetCustomer,
        ageRange: { min: minAge, max: maxAge },
        localities,
        preferences,
      };

      await callFunction({
        functionName: 'updateBusinessBrain',
        data: {
          businessId: business.businessId,
          audience: newAudience,
        },
      });

      onSaved({
        businessBrain: {
          ...business.businessBrain,
          audience: newAudience,
        } as any,
      });

      setSavedNotice('Audience profile updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save audience profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Customers & Target Audience</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tell Mitra who buys from you so hooks, tone, and messaging resonate with your exact
          audience.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {savedNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          ✓ {savedNotice}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Target Customer Persona
          </label>
          <textarea
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            rows={3}
            placeholder="e.g. IT professionals, foodies, families who love authentic Hyderabadi Dum Biryani and late-night cravings"
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Minimum Target Age"
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(Number(e.target.value))}
          />
          <Input
            label="Maximum Target Age"
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
          />
        </div>

        <Input
          label="Target Localities / Neighborhoods (comma separated)"
          value={localitiesText}
          onChange={(e) => setLocalitiesText(e.target.value)}
          placeholder="Jubilee Hills, Madhapur, Hitec City, Kondapur, Banjara Hills"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Customer Preferences & Pain Points Solved
          </label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={3}
            placeholder="e.g. Looking for authentic taste without compromising on hygiene. Quick delivery during lunch hours."
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Audience Profile'}
        </Button>
      </div>
    </form>
  );
}
