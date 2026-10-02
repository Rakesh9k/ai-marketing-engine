'use client';

import { useState } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/services/api';

interface PreferencesSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

const OPERATING_MODES = ['dine-in', 'takeaway', 'delivery'] as const;

export function PreferencesSection({ business, onSaved, onCancel }: PreferencesSectionProps) {
  const currentMode = business.businessBrain?.businessRules?.operatingMode || 'dine-in';
  const [operatingMode, setOperatingMode] = useState(currentMode);
  
  const [channels, setChannels] = useState<{ instagram: boolean; whatsapp: boolean; facebook: boolean }>({
    instagram: true,
    whatsapp: true,
    facebook: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(null);

    try {
      await callFunction({
        functionName: 'updateBusinessBrain',
        data: {
          businessId: business.businessId,
          businessRules: {
            operatingMode,
          },
        },
      });

      onSaved({
        businessBrain: {
          ...business.businessBrain,
          businessRules: {
            ...(business.businessBrain?.businessRules || {}),
            operatingMode,
          },
        } as any,
      });

      setSavedNotice('Marketing Preferences updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Marketing Preferences & Channels</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Preferred publishing platforms, channel defaults, and business fulfillment modes.
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

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-semibold text-neutral-900">Fulfillment / Operating Modes</label>
          <div className="flex flex-wrap gap-3">
            {OPERATING_MODES.map((mode) => {
              const active = operatingMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOperatingMode(mode)}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold capitalize transition-all ${
                    active
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                      : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {mode.replace('-', ' ')}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Mitra will tailor Call-To-Action buttons and offer messaging based on your selected mode.
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-neutral-900">Active Marketing Channels</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-300">
              <span className="font-medium text-neutral-900">Instagram</span>
              <input
                type="checkbox"
                checked={channels.instagram}
                onChange={(e) => setChannels({ ...channels, instagram: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-300">
              <span className="font-medium text-neutral-900">WhatsApp Business</span>
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-300">
              <span className="font-medium text-neutral-900">Facebook Page</span>
              <input
                type="checkbox"
                checked={channels.facebook}
                onChange={(e) => setChannels({ ...channels, facebook: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
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
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  );
}
