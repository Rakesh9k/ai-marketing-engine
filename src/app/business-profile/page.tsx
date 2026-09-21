'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, brandKitService, productService } from '@/services/database';
import { callFunction } from '@/services/api';
import type { Business, BrandKit, Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MascotScene } from '@/components/mascot/MascotScene';

/**
 * Phase 33 — "Your Business Profile": a customer-facing view over the
 * Business Brain internal data model. Nothing here is named after, or
 * shaped like, a raw database field path — every label is the plain-
 * language question a business owner would actually ask ("What tone
 * should Mitra use?" not "businessBrain.brand.tone").
 *
 * Every write on this page goes through a Cloud Function
 * (updateBusiness / updateBusinessBrain) — never a direct client Firestore
 * write — so every save is authenticated (the callable requires
 * request.auth), authorized (verifyBusinessAccess), and validated (Zod)
 * before it's persisted. Fields that must never be customer-editable
 * (credits, Truth Check status, ownership, tenant IDs, internal
 * authorization, billing state) simply have no field in either Cloud
 * Function's schema — there is no code path from this page to them.
 *
 * Campaign impact: this page never touches a Campaign document and never
 * re-marks a stored Truth Check result as verified. Existing campaigns are
 * re-checked for staleness lazily, on read, by getCampaign's
 * isVerificationStale (extended in this same phase to also cover
 * businessRules.deliveryRadiusKm/minimumOrder and verticalProfile — see
 * functions/src/services/ai/truthCheck.ts). Saving a field that feeds that
 * check shows an inline notice here so the owner isn't surprised later.
 */

type SavedNotice = { message: string; warnStale: boolean } | null;

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function useDirty<T>(baseline: T, draft: T): boolean {
  return useMemo(() => JSON.stringify(baseline) !== JSON.stringify(draft), [baseline, draft]);
}

function SectionCard({
  title,
  description,
  children,
  onSave,
  onCancel,
  dirty,
  saving,
  error,
  savedNotice,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  onCancel: () => void;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  savedNotice: SavedNotice;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>

      <div className="space-y-4">{children}</div>

      {error && (
        <p className="text-error-600 mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      {savedNotice && (
        <div
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            savedNotice.warnStale
              ? 'bg-warning-50 text-warning-600'
              : 'bg-success-50 text-success-600'
          }`}
        >
          {savedNotice.warnStale ? '⚠️ ' : '✓ '}
          {savedNotice.message}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={!dirty || saving}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Business section — reuses the exact fields onboarding collects, saved via
// the existing updateBusiness Cloud Function (no new write path for these).
// ---------------------------------------------------------------------------
interface BusinessDraft {
  name: string;
  description: string;
  city: string;
  state: string;
  locality: string;
  address: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
}

function toBusinessDraft(b: Business): BusinessDraft {
  return {
    name: b.name,
    description: b.description || '',
    city: b.location.city,
    state: b.location.state,
    locality: b.location.locality || '',
    address: b.location.address || '',
    phone: b.contact.phone,
    whatsapp: b.contact.whatsapp,
    website: b.contact.website || '',
    instagram: b.contact.instagram || '',
  };
}

function BusinessSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (updated: Partial<Business>) => void;
}) {
  const baseline = useMemo(() => toBusinessDraft(business), [business]);
  const [draft, setDraft] = useState<BusinessDraft>(baseline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);
  const dirty = useDirty(baseline, draft);

  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await callFunction({
        functionName: 'updateBusiness',
        data: {
          businessId: business.businessId,
          name: draft.name,
          description: draft.description,
          location: {
            city: draft.city,
            state: draft.state,
            locality: draft.locality || undefined,
            address: draft.address || undefined,
          },
          contact: {
            phone: draft.phone,
            whatsapp: draft.whatsapp,
            website: draft.website || undefined,
            instagram: draft.instagram || undefined,
          },
        },
      });
      onSaved({
        name: draft.name,
        description: draft.description,
        location: {
          city: draft.city,
          state: draft.state,
          locality: draft.locality,
          address: draft.address,
        },
        contact: {
          phone: draft.phone,
          whatsapp: draft.whatsapp,
          website: draft.website,
          instagram: draft.instagram,
        },
      });
      setNotice({
        message:
          'Saved. Campaigns generated with the old phone/WhatsApp/location will now show as outdated when you view them.',
        warnStale: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Business"
      description="The core details Mitra uses to introduce and locate your business."
      onSave={() => void handleSave()}
      onCancel={() => {
        setDraft(baseline);
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <Input
        label="Business name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div>
        <label className="text-text-primary mb-1.5 block text-sm font-medium">Category</label>
        <input
          value={business.category.replace('_', ' ')}
          disabled
          className="text-text-tertiary bg-bg-secondary border-border-medium w-full rounded-md border px-4 py-2.5 text-base capitalize"
        />
        <p className="text-text-tertiary mt-1 text-xs">
          Your business category can't be changed here — contact support if you need to switch.
        </p>
      </div>
      <div>
        <label className="text-text-primary mb-1.5 block text-sm font-medium">Description</label>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={3}
          maxLength={500}
          className="text-text-primary bg-surface focus:ring-brand-500 border-border-medium w-full rounded-md border px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="City"
          value={draft.city}
          onChange={(e) => setDraft({ ...draft, city: e.target.value })}
        />
        <Input
          label="State"
          value={draft.state}
          onChange={(e) => setDraft({ ...draft, state: e.target.value })}
        />
        <Input
          label="Locality / area"
          value={draft.locality}
          onChange={(e) => setDraft({ ...draft, locality: e.target.value })}
        />
        <Input
          label="Address"
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Phone"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        />
        <Input
          label="WhatsApp number"
          value={draft.whatsapp}
          onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
        />
        <Input
          label="Website (optional)"
          value={draft.website}
          onChange={(e) => setDraft({ ...draft, website: e.target.value })}
        />
        <Input
          label="Instagram handle (optional)"
          value={draft.instagram}
          onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
        />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Brand section — read-only summary. brand_kits (edited on /brand) is the
// real, engine-consumed brand data source; businessBrain.brand is a
// write-once field the generation pipeline doesn't read. Duplicating an
// edit form here would create two diverging "brand" states, so this
// section deliberately just shows the live brand kit and links to the one
// real editor.
// ---------------------------------------------------------------------------
function BrandSection({ brandKit }: { brandKit: BrandKit | null }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Brand</h2>
          <p className="mt-1 text-sm text-neutral-500">
            How Mitra sounds and looks in your campaigns.
          </p>
        </div>
        <Link href="/brand">
          <Button variant="secondary" size="sm">
            Edit brand
          </Button>
        </Link>
      </div>
      {brandKit ? (
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Tone</dt>
            <dd className="text-neutral-900 capitalize">{brandKit.tone}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Personality</dt>
            <dd className="text-neutral-900">{brandKit.personality || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Visual preferences</dt>
            <dd className="text-neutral-900">{brandKit.visualPreferences || '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-neutral-500">
          You haven't set up a brand kit yet.{' '}
          <Link href="/brand" className="text-brand-600 underline">
            Set it up
          </Link>
          .
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Products/Services section — restaurant gets a read-only summary + link to
// the existing /products editor; salon/real-estate get full inline editing
// of the vertical model here (no other edit path exists for these post-
// onboarding, closing the Phase 30/31 gap).
// ---------------------------------------------------------------------------
const SERVICE_CATEGORIES = [
  'hair',
  'skin',
  'nails',
  'makeup',
  'bridal',
  'spa',
  'grooming',
  'other',
] as const;
const PROPERTY_TYPES = ['apartment', 'villa', 'plot', 'commercial', 'other'] as const;
const POSSESSION_STATUSES = ['ready_to_move', 'under_construction', 'upcoming'] as const;

type ServiceDraft = NonNullable<
  NonNullable<Business['businessBrain']['verticalProfile']>['services']
>[number];
type PackageDraft = NonNullable<
  NonNullable<Business['businessBrain']['verticalProfile']>['packages']
>[number];
type PropertyDraft = NonNullable<
  NonNullable<Business['businessBrain']['verticalProfile']>['properties']
>[number];

function RestaurantProductsSection({ products }: { products: Product[] }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Products / Services</h2>
          <p className="mt-1 text-sm text-neutral-500">Your menu items and prices.</p>
        </div>
        <Link href="/products">
          <Button variant="secondary" size="sm">
            Manage products
          </Button>
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">No products added yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {products.slice(0, 6).map((p) => (
            <li key={p.productId} className="flex items-center justify-between py-2 text-sm">
              <span className="text-neutral-900">{p.name}</span>
              <span className="text-neutral-500">₹{p.price}</span>
            </li>
          ))}
        </ul>
      )}
      {products.length > 6 && (
        <p className="mt-2 text-xs text-neutral-500">and {products.length - 6} more…</p>
      )}
    </section>
  );
}

function SalonServicesSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (verticalProfile: Business['businessBrain']['verticalProfile']) => void;
}) {
  const baselineServices = useMemo(
    () => business.businessBrain.verticalProfile?.services || [],
    [business]
  );
  const baselinePackages = useMemo(
    () => business.businessBrain.verticalProfile?.packages || [],
    [business]
  );
  const baselineAppt = useMemo(
    () =>
      business.businessBrain.verticalProfile?.appointmentSettings || {
        acceptInquiries: true,
        preferredBookingChannel: 'whatsapp' as const,
        bookingInstructions: '',
      },
    [business]
  );

  const [services, setServices] = useState<ServiceDraft[]>(baselineServices);
  const [packages, setPackages] = useState<PackageDraft[]>(baselinePackages);
  const [appt, setAppt] = useState(baselineAppt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);

  useEffect(() => {
    setServices(baselineServices);
    setPackages(baselinePackages);
    setAppt(baselineAppt);
  }, [baselineServices, baselinePackages, baselineAppt]);

  const dirty = useDirty(
    { baselineServices, baselinePackages, baselineAppt },
    { services, packages, appt }
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await callFunction<
        {
          businessId: string;
          services: ServiceDraft[];
          packages: PackageDraft[];
          appointmentSettings: typeof appt;
        },
        { businessBrain: Business['businessBrain'] }
      >({
        functionName: 'updateBusinessBrain',
        data: { businessId: business.businessId, services, packages, appointmentSettings: appt },
      });
      onSaved(result.businessBrain.verticalProfile);
      setNotice({
        message:
          'Saved. Campaigns built from the old services/packages will now show as outdated when you view them.',
        warnStale: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Products / Services"
      description="The services and packages Mitra can build campaigns about."
      onSave={() => void handleSave()}
      onCancel={() => {
        setServices(baselineServices);
        setPackages(baselinePackages);
        setAppt(baselineAppt);
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Services</h3>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div
              key={s.id}
              className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-5"
            >
              <input
                value={s.name}
                onChange={(e) =>
                  setServices(
                    services.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                  )
                }
                placeholder="Service name"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
              />
              <select
                value={s.category}
                onChange={(e) =>
                  setServices(
                    services.map((x, idx) =>
                      idx === i ? { ...x, category: e.target.value as ServiceDraft['category'] } : x
                    )
                  )
                }
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={s.price}
                onChange={(e) =>
                  setServices(
                    services.map((x, idx) =>
                      idx === i ? { ...x, price: Number(e.target.value) } : x
                    )
                  )
                }
                placeholder="Price"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setServices(services.filter((_, idx) => idx !== i))}
                className="text-error-600 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setServices([
                ...services,
                { id: generateId(), name: '', category: 'other', price: 0, active: true },
              ])
            }
            className="text-brand-600 text-sm font-medium hover:underline"
          >
            + Add service
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Packages</h3>
        <div className="space-y-3">
          {packages.map((p, i) => (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-5"
            >
              <input
                value={p.name}
                onChange={(e) =>
                  setPackages(
                    packages.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                  )
                }
                placeholder="Package name"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
              />
              <input
                type="number"
                value={p.packagePrice}
                onChange={(e) =>
                  setPackages(
                    packages.map((x, idx) =>
                      idx === i ? { ...x, packagePrice: Number(e.target.value) } : x
                    )
                  )
                }
                placeholder="Price"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <input
                value={p.description || ''}
                onChange={(e) =>
                  setPackages(
                    packages.map((x, idx) =>
                      idx === i ? { ...x, description: e.target.value } : x
                    )
                  )
                }
                placeholder="Description"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-1"
              />
              <button
                type="button"
                onClick={() => setPackages(packages.filter((_, idx) => idx !== i))}
                className="text-error-600 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setPackages([
                ...packages,
                { id: generateId(), name: '', serviceIds: [], packagePrice: 0, active: true },
              ])
            }
            className="text-brand-600 text-sm font-medium hover:underline"
          >
            + Add package
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Booking</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={appt.acceptInquiries}
              onChange={(e) => setAppt({ ...appt, acceptInquiries: e.target.checked })}
            />
            Accept booking inquiries
          </label>
          <select
            value={appt.preferredBookingChannel}
            onChange={(e) =>
              setAppt({
                ...appt,
                preferredBookingChannel: e.target.value as typeof appt.preferredBookingChannel,
              })
            }
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="in_person">In person</option>
          </select>
        </div>
      </div>
    </SectionCard>
  );
}

function RealEstatePropertiesSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (verticalProfile: Business['businessBrain']['verticalProfile']) => void;
}) {
  const baselineProperties = useMemo(
    () => business.businessBrain.verticalProfile?.properties || [],
    [business]
  );
  const [properties, setProperties] = useState<PropertyDraft[]>(baselineProperties);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);
  const dirty = useDirty(baselineProperties, properties);

  useEffect(() => {
    setProperties(baselineProperties);
  }, [baselineProperties]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await callFunction<
        { businessId: string; properties: PropertyDraft[] },
        { businessBrain: Business['businessBrain'] }
      >({
        functionName: 'updateBusinessBrain',
        data: { businessId: business.businessId, properties },
      });
      onSaved(result.businessBrain.verticalProfile);
      setNotice({
        message:
          'Saved. Campaigns built from the old listing details will now show as outdated when you view them.',
        warnStale: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Products / Services"
      description="The properties and listings Mitra can build campaigns about."
      onSave={() => void handleSave()}
      onCancel={() => {
        setProperties(baselineProperties);
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <div className="space-y-3">
        {properties.map((p, i) => (
          <div
            key={p.id}
            className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-6"
          >
            <input
              value={p.title}
              onChange={(e) =>
                setProperties(
                  properties.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x))
                )
              }
              placeholder="Listing title"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
            />
            <select
              value={p.propertyType}
              onChange={(e) =>
                setProperties(
                  properties.map((x, idx) =>
                    idx === i
                      ? { ...x, propertyType: e.target.value as PropertyDraft['propertyType'] }
                      : x
                  )
                )
              }
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={p.price}
              onChange={(e) =>
                setProperties(
                  properties.map((x, idx) =>
                    idx === i ? { ...x, price: Number(e.target.value) } : x
                  )
                )
              }
              placeholder="Price"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <select
              value={p.possessionStatus}
              onChange={(e) =>
                setProperties(
                  properties.map((x, idx) =>
                    idx === i
                      ? {
                          ...x,
                          possessionStatus: e.target.value as PropertyDraft['possessionStatus'],
                        }
                      : x
                  )
                )
              }
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {POSSESSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setProperties(properties.filter((_, idx) => idx !== i))}
              className="text-error-600 text-sm hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setProperties([
              ...properties,
              {
                id: generateId(),
                title: '',
                propertyType: 'apartment',
                price: 0,
                possessionStatus: 'ready_to_move',
                amenities: [],
                availability: 'available',
                active: true,
              },
            ])
          }
          className="text-brand-600 text-sm font-medium hover:underline"
        >
          + Add property
        </button>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Audience section
// ---------------------------------------------------------------------------
function AudienceSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (audience: Business['businessBrain']['audience']) => void;
}) {
  const baseline = business.businessBrain.audience;
  const [draft, setDraft] = useState(baseline);
  const [localitiesText, setLocalitiesText] = useState(baseline.localities.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);

  useEffect(() => {
    setDraft(baseline);
    setLocalitiesText(baseline.localities.join(', '));
  }, [baseline]);

  const dirty = useDirty(
    { ...baseline, localities: baseline.localities.join(', ') },
    { ...draft, localities: localitiesText }
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const localities = localitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await callFunction({
        functionName: 'updateBusinessBrain',
        data: {
          businessId: business.businessId,
          audience: {
            targetCustomer: draft.targetCustomer,
            ageRange: draft.ageRange,
            localities,
            preferences: draft.preferences,
          },
        },
      });
      onSaved({ ...draft, localities });
      setNotice({ message: 'Saved.', warnStale: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Audience"
      description="Who Mitra should be writing to."
      onSave={() => void handleSave()}
      onCancel={() => {
        setDraft(baseline);
        setLocalitiesText(baseline.localities.join(', '));
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <div>
        <label className="text-text-primary mb-1.5 block text-sm font-medium">
          Who is your typical customer?
        </label>
        <textarea
          value={draft.targetCustomer}
          onChange={(e) => setDraft({ ...draft, targetCustomer: e.target.value })}
          rows={2}
          className="text-text-primary bg-surface focus:ring-brand-500 border-border-medium w-full rounded-md border px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Minimum age"
          type="number"
          value={draft.ageRange.min}
          onChange={(e) =>
            setDraft({ ...draft, ageRange: { ...draft.ageRange, min: Number(e.target.value) } })
          }
        />
        <Input
          label="Maximum age"
          type="number"
          value={draft.ageRange.max}
          onChange={(e) =>
            setDraft({ ...draft, ageRange: { ...draft.ageRange, max: Number(e.target.value) } })
          }
        />
      </div>
      <Input
        label="Neighbourhoods / localities you serve (comma-separated)"
        value={localitiesText}
        onChange={(e) => setLocalitiesText(e.target.value)}
      />
      <div>
        <label className="text-text-primary mb-1.5 block text-sm font-medium">
          Anything else about your audience?
        </label>
        <textarea
          value={draft.preferences}
          onChange={(e) => setDraft({ ...draft, preferences: e.target.value })}
          rows={2}
          className="text-text-primary bg-surface focus:ring-brand-500 border-border-medium w-full rounded-md border px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Location & Language section — the existing supported language/style
// options are reused unchanged, per the Phase 33 spec.
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'Telugu' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te_en', label: 'Telugu + English mix' },
  { value: 'hi_en', label: 'Hindi + English mix' },
] as const;
const REGIONAL_STYLES = [
  'neutral',
  'hyderabadi',
  'telangana',
  'mumbai',
  'bangalore',
  'delhi',
  'chennai',
  'kolkata',
] as const;
const SLANG_LEVELS = ['none', 'light', 'moderate', 'heavy'] as const;

function LocalizationSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (localization: Business['businessBrain']['localization']) => void;
}) {
  const baseline = business.businessBrain.localization;
  const [draft, setDraft] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);
  const dirty = useDirty(baseline, draft);

  useEffect(() => setDraft(baseline), [baseline]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await callFunction({
        functionName: 'updateBusinessBrain',
        data: { businessId: business.businessId, localization: draft },
      });
      onSaved(draft);
      setNotice({ message: 'Saved.', warnStale: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Location & Language"
      description="The language and local tone Mitra writes your campaigns in."
      onSave={() => void handleSave()}
      onCancel={() => {
        setDraft(baseline);
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-text-primary mb-1.5 block text-sm font-medium">
            Primary language
          </label>
          <select
            value={draft.primaryLanguage}
            onChange={(e) =>
              setDraft({
                ...draft,
                primaryLanguage: e.target.value as typeof draft.primaryLanguage,
              })
            }
            className="border-border-medium w-full rounded-md border px-4 py-2.5 text-base"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-text-primary mb-1.5 block text-sm font-medium">
            Regional style
          </label>
          <select
            value={draft.regionalStyle}
            onChange={(e) =>
              setDraft({ ...draft, regionalStyle: e.target.value as typeof draft.regionalStyle })
            }
            className="border-border-medium w-full rounded-md border px-4 py-2.5 text-base capitalize"
          >
            {REGIONAL_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-text-primary mb-1.5 block text-sm font-medium">
            Local slang, how much?
          </label>
          <select
            value={draft.slangIntensity}
            onChange={(e) =>
              setDraft({ ...draft, slangIntensity: e.target.value as typeof draft.slangIntensity })
            }
            className="border-border-medium w-full rounded-md border px-4 py-2.5 text-base capitalize"
          >
            {SLANG_LEVELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Marketing Preferences section — how the business currently operates,
// which shapes the CTAs and offers Mitra can honestly generate.
// ---------------------------------------------------------------------------
const OPERATING_MODES = ['dine-in', 'takeaway', 'delivery'] as const;

function MarketingPreferencesSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (
    operatingMode: NonNullable<Business['businessBrain']['businessRules']['operatingMode']>
  ) => void;
}) {
  const baseline = business.businessBrain.businessRules.operatingMode || 'dine-in';
  const [draft, setDraft] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);
  const dirty = draft !== baseline;

  useEffect(() => setDraft(baseline), [baseline]);

  if (business.category !== 'restaurant') {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await callFunction({
        functionName: 'updateBusinessBrain',
        data: { businessId: business.businessId, businessRules: { operatingMode: draft } },
      });
      onSaved(draft);
      setNotice({ message: 'Saved.', warnStale: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Marketing Preferences"
      description="How customers can currently get your food — Mitra won't promise a mode you don't offer."
      onSave={() => void handleSave()}
      onCancel={() => {
        setDraft(baseline);
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <div className="flex gap-2">
        {OPERATING_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setDraft(mode)}
            aria-pressed={draft === mode}
            className={`rounded-md px-3 py-2 text-sm font-medium capitalize ${
              draft === mode
                ? 'bg-brand-600 text-white'
                : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {mode.replace('-', ' ')}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Business Rules section — only the safe subset: things not to claim,
// promotion constraints, delivery radius / minimum order. Nothing
// security-critical (credits, Truth Check, ownership, tenant, auth,
// billing) has a field here — see updateBusinessBrain's Zod schema.
// ---------------------------------------------------------------------------
function BusinessRulesSection({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: (rules: Partial<Business['businessBrain']['businessRules']>) => void;
}) {
  const baseline = {
    deliveryRadiusKm: business.businessBrain.businessRules.deliveryRadiusKm,
    minimumOrder: business.businessBrain.businessRules.minimumOrder,
    offerValidityRules: business.businessBrain.businessRules.offerValidityRules,
    pricingRules: business.businessBrain.businessRules.pricingRules,
  };
  const [draft, setDraft] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SavedNotice>(null);
  const dirty = useDirty(baseline, draft);

  useEffect(() => setDraft(baseline), [JSON.stringify(baseline)]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await callFunction({
        functionName: 'updateBusinessBrain',
        data: { businessId: business.businessId, businessRules: draft },
      });
      onSaved(draft);
      setNotice({
        message:
          'Saved. Campaigns generated under the old delivery radius / minimum order will now show as outdated when you view them.',
        warnStale: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Business Rules"
      description="Safe guardrails Mitra follows — not internal system rules."
      onSave={() => void handleSave()}
      onCancel={() => {
        setDraft(baseline);
        setNotice(null);
        setError(null);
      }}
      dirty={dirty}
      saving={saving}
      error={error}
      savedNotice={notice}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Delivery radius (km)"
          type="number"
          value={draft.deliveryRadiusKm}
          onChange={(e) => setDraft({ ...draft, deliveryRadiusKm: Number(e.target.value) })}
        />
        <Input
          label="Minimum order value (₹)"
          type="number"
          value={draft.minimumOrder}
          onChange={(e) => setDraft({ ...draft, minimumOrder: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="text-text-primary mb-1.5 block text-sm font-medium">
          Things Mitra should never claim about your business
        </label>
        <textarea
          value={draft.offerValidityRules}
          onChange={(e) => setDraft({ ...draft, offerValidityRules: e.target.value })}
          rows={2}
          placeholder="e.g. never say 'lowest price in the city', don't stack offers"
          className="text-text-primary bg-surface focus:ring-brand-500 border-border-medium w-full rounded-md border px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-text-primary mb-1.5 block text-sm font-medium">
          Promotion / pricing constraints
        </label>
        <textarea
          value={draft.pricingRules}
          onChange={(e) => setDraft({ ...draft, pricingRules: e.target.value })}
          rows={2}
          placeholder="e.g. discounts capped at 20%, no combining with festival offers"
          className="text-text-primary bg-surface focus:ring-brand-500 border-border-medium w-full rounded-md border px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadBusinesses() {
      try {
        const businessesData = await businessService.getByUserId(user!.uid);
        if (cancelled) return;
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          setSelectedBusinessId(businessesData[0]!.businessId);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError("Couldn't load your businesses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reload = useCallback(async (businessId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [b, kit, prods] = await Promise.all([
        businessService.get(businessId),
        brandKitService.get(businessId).catch(() => null),
        productService.listByBusiness(businessId).catch(() => []),
      ]);
      setBusiness(b);
      setBrandKit(kit ?? null);
      setProducts(prods);
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load your business profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBusinessId) void reload(selectedBusinessId);
  }, [selectedBusinessId, reload]);

  if (loading && !business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="bg-bg-primary min-h-screen p-8">
        <MascotScene
          pose="point"
          align="center"
          message="No business set up yet."
          supporting="Create your first business to manage your profile."
        >
          <Link href="/onboarding" className="mt-4 inline-block">
            <Button>Create Business</Button>
          </Link>
        </MascotScene>
      </div>
    );
  }

  if (loadError || !business) {
    return (
      <div className="flex justify-center p-8">
        <MascotScene
          pose="concerned"
          align="center"
          message="Something got in the way."
          supporting={loadError || ''}
        >
          <Button
            size="sm"
            className="mt-4"
            onClick={() => selectedBusinessId && void reload(selectedBusinessId)}
          >
            Try again
          </Button>
        </MascotScene>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Your Business Profile</h1>
          <p className="mt-1 text-neutral-500">
            Review and update what Mitra knows about your business.
          </p>
        </div>
        {businesses.length > 1 && (
          <select
            value={selectedBusinessId || ''}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            aria-label="Select business"
          >
            {businesses.map((b) => (
              <option key={b.businessId} value={b.businessId}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        <BusinessSection
          business={business}
          onSaved={(patch) => setBusiness({ ...business, ...patch } as Business)}
        />

        <BrandSection brandKit={brandKit} />

        {business.category === 'restaurant' && <RestaurantProductsSection products={products} />}
        {business.category === 'salon' && (
          <SalonServicesSection
            business={business}
            onSaved={(verticalProfile) =>
              setBusiness({
                ...business,
                businessBrain: { ...business.businessBrain, verticalProfile },
              })
            }
          />
        )}
        {business.category === 'real_estate' && (
          <RealEstatePropertiesSection
            business={business}
            onSaved={(verticalProfile) =>
              setBusiness({
                ...business,
                businessBrain: { ...business.businessBrain, verticalProfile },
              })
            }
          />
        )}

        <AudienceSection
          business={business}
          onSaved={(audience) =>
            setBusiness({ ...business, businessBrain: { ...business.businessBrain, audience } })
          }
        />

        <LocalizationSection
          business={business}
          onSaved={(localization) =>
            setBusiness({ ...business, businessBrain: { ...business.businessBrain, localization } })
          }
        />

        <MarketingPreferencesSection
          business={business}
          onSaved={(operatingMode) =>
            setBusiness({
              ...business,
              businessBrain: {
                ...business.businessBrain,
                businessRules: { ...business.businessBrain.businessRules, operatingMode },
              },
            })
          }
        />

        <BusinessRulesSection
          business={business}
          onSaved={(rules) =>
            setBusiness({
              ...business,
              businessBrain: {
                ...business.businessBrain,
                businessRules: { ...business.businessBrain.businessRules, ...rules },
              },
            })
          }
        />
      </div>
    </div>
  );
}
