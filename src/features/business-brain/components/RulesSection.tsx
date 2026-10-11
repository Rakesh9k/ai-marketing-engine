'use client';

import { useState } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/services/api';

interface RulesSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

export function RulesSection({ business, onSaved, onCancel }: RulesSectionProps) {
  // Only what is stored. With nothing stored this saves no radius, minimum order or operating mode:
  // it used to save 10 km, ₹0 and "dine-in" as if the owner had said them.
  const currentRules = business.businessBrain?.businessRules || {
    offerValidityRules: '',
    pricingRules: '',
  };

  const [prohibitInventedProducts, setProhibitInventedProducts] = useState(true);
  const [prohibitInventedClaims, setProhibitInventedClaims] = useState(true);
  const [requireExplicitPricing, setRequireExplicitPricing] = useState(true);
  const [negativeKeywords, setNegativeKeywords] = useState(
    'cheap, fake, low quality, discount outlet'
  );

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
            ...currentRules,
          },
        },
      });

      onSaved({
        businessBrain: {
          ...business.businessBrain,
        } as any,
      });

      setSavedNotice('Business Rules & AI Guardrails updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules.');
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
        <h2 className="text-xl font-bold text-neutral-900">Business Rules & AI Guardrails</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Strict boundaries and negative keywords Mitra must obey when writing copy and generating
          assets.
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
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-300">
            <div>
              <span className="font-semibold text-neutral-900">
                Prohibit Unverified Product Claims
              </span>
              <p className="text-xs text-neutral-500">
                Mitra will never promise products not present in your catalog.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prohibitInventedProducts}
              onChange={(e) => setProhibitInventedProducts(e.target.checked)}
              className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-neutral-300"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-300">
            <div>
              <span className="font-semibold text-neutral-900">Strict Price Verification</span>
              <p className="text-xs text-neutral-500">
                Require exact ₹ pricing in all promotional assets.
              </p>
            </div>
            <input
              type="checkbox"
              checked={requireExplicitPricing}
              onChange={(e) => setRequireExplicitPricing(e.target.checked)}
              className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-neutral-300"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-300">
            <div>
              <span className="font-semibold text-neutral-900">Truth Check Enforcement</span>
              <p className="text-xs text-neutral-500">
                Run Truth Check before marking any campaign ready for publication.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prohibitInventedClaims}
              onChange={(e) => setProhibitInventedClaims(e.target.checked)}
              className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-neutral-300"
            />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Forbidden Words / Negative Keywords (comma separated)
          </label>
          <textarea
            value={negativeKeywords}
            onChange={(e) => setNegativeKeywords(e.target.value)}
            rows={2}
            placeholder="cheap, discount store, low price, bad service"
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
          {saving ? 'Saving...' : 'Save Guardrails'}
        </Button>
      </div>
    </form>
  );
}
