'use client';

import { useState } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { callFunction } from '@/services/api';

interface LocationsSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

export function LocationsSection({ business, onSaved, onCancel }: LocationsSectionProps) {
  const [city, setCity] = useState(business.location?.city || '');
  const [state, setState] = useState(business.location?.state || '');
  const [locality, setLocality] = useState(business.location?.locality || '');
  const [address, setAddress] = useState(business.location?.address || '');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number>(
    business.businessBrain?.businessRules?.deliveryRadiusKm || 10
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
        functionName: 'updateBusiness',
        data: {
          businessId: business.businessId,
          location: {
            city,
            state,
            locality: locality || undefined,
            address: address || undefined,
          },
        },
      });

      await callFunction({
        functionName: 'updateBusinessBrain',
        data: {
          businessId: business.businessId,
          businessRules: {
            deliveryRadiusKm,
          },
        },
      });

      onSaved({
        location: {
          ...business.location,
          city,
          state,
          locality,
          address,
        },
        businessBrain: {
          ...business.businessBrain,
          businessRules: {
            ...(business.businessBrain?.businessRules || {}),
            deliveryRadiusKm,
          },
        } as any,
      });

      setSavedNotice('Location and Service Radius updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Locations & Outlets</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Primary outlet location, address, and delivery service coverage area.
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
          <Input
            label="City *"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
          <Input
            label="State *"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Locality / Neighborhood"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="e.g. Madhapur, Gachibowli"
          />
          <Input
            label="Full Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Near Metro Pillar 123"
          />
        </div>

        <div className="pt-2">
          <Input
            label="Delivery / Service Radius (in km)"
            type="number"
            value={deliveryRadiusKm}
            onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
            placeholder="10"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Mitra uses this radius to specify local offer validity and delivery areas in generated copy.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Locations'}
        </Button>
      </div>
    </form>
  );
}
