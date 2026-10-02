'use client';

import { useState } from 'react';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { callFunction } from '@/services/api';

interface BusinessProfileSectionProps {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
  onCancel?: () => void;
}

export function BusinessProfileSection({ business, onSaved, onCancel }: BusinessProfileSectionProps) {
  const [name, setName] = useState(business.name || '');
  const [description, setDescription] = useState(business.description || '');
  const [city, setCity] = useState(business.location?.city || '');
  const [state, setState] = useState(business.location?.state || '');
  const [locality, setLocality] = useState(business.location?.locality || '');
  const [address, setAddress] = useState(business.location?.address || '');
  const [phone, setPhone] = useState(business.contact?.phone || '');
  const [whatsapp, setWhatsapp] = useState(business.contact?.whatsapp || '');
  const [website, setWebsite] = useState(business.contact?.website || '');
  const [instagram, setInstagram] = useState(business.contact?.instagram || '');
  
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
          name,
          description,
          location: {
            city,
            state,
            locality: locality || undefined,
            address: address || undefined,
          },
          contact: {
            phone,
            whatsapp,
            website: website || undefined,
            instagram: instagram || undefined,
          },
        },
      });

      const updated = {
        name,
        description,
        location: {
          ...business.location,
          city,
          state,
          locality,
          address,
        },
        contact: {
          ...business.contact,
          phone,
          whatsapp,
          website,
          instagram,
        },
      };

      onSaved(updated);
      setSavedNotice('Business Profile updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save business profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Business Profile</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Core identity, location, and contact information Mitra uses across all generated marketing assets.
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
        <Input
          label="Business Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Category</label>
          <input
            value={business.category?.replace(/_/g, ' ') || 'restaurant'}
            disabled
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-500 capitalize cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Category is locked to ensure compliance with vertical models.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Business Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Tell Mitra what makes your business special..."
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

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
          <Input
            label="Locality / Area"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="e.g. Jubilee Hills"
          />
          <Input
            label="Street Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Plot 42, Road No 36"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Phone Number *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="WhatsApp Business Number *"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
          <Input
            label="Website (Optional)"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourbusiness.com"
          />
          <Input
            label="Instagram Handle (Optional)"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourbusiness"
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
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
