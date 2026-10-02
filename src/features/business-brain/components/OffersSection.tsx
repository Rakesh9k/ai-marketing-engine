'use client';

import { useState } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { callFunction } from '@/services/api';

interface OffersSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

export function OffersSection({ business, onSaved, onCancel }: OffersSectionProps) {
  const [offerValidityRules, setOfferValidityRules] = useState(
    business.businessBrain?.businessRules?.offerValidityRules || ''
  );
  const [pricingRules, setPricingRules] = useState(
    business.businessBrain?.businessRules?.pricingRules || ''
  );
  const [minimumOrder, setMinimumOrder] = useState<number>(
    business.businessBrain?.businessRules?.minimumOrder || 0
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
            offerValidityRules,
            pricingRules,
            minimumOrder,
          },
        },
      });

      onSaved({
        businessBrain: {
          ...business.businessBrain,
          businessRules: {
            ...(business.businessBrain?.businessRules || {}),
            offerValidityRules,
            pricingRules,
            minimumOrder,
          },
        } as any,
      });

      setSavedNotice('Offers & Deals settings updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save offers.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Offers, Deals & Pricing Rules</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Set up active promotions, festive combos, discount guidelines, and minimum order requirements.
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
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Active Festive Offers & Promo Guidelines
          </label>
          <textarea
            value={offerValidityRules}
            onChange={(e) => setOfferValidityRules(e.target.value)}
            rows={3}
            placeholder="e.g. 15% OFF on orders above ₹499 during weekends. Buy 2 Get 1 Free on all Biryani combos on Tuesdays."
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Pricing & Discounting Rules
          </label>
          <textarea
            value={pricingRules}
            onChange={(e) => setPricingRules(e.target.value)}
            rows={3}
            placeholder="e.g. Never discount premium gift packs. Taxes extra. GST included in prices."
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        <Input
          label="Minimum Order Amount (₹)"
          type="number"
          value={minimumOrder || ''}
          onChange={(e) => setMinimumOrder(Number(e.target.value))}
          placeholder="250"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Offers & Rules'}
        </Button>
      </div>
    </form>
  );
}
