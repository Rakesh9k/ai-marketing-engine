'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  businessService,
  productService,
  subscriptionService,
  usageService,
} from '@/services/database';
import { callFunction } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { ImageUploader } from '@/features/asset/components/ImageUploader';
import type { Asset } from '@/features/asset/services/assetService';
import { GenerationProgress } from './GenerationProgress';
import type { CampaignWizardState } from '../types';
import { createInitialWizardState } from '../types';
import { buildCampaignInput as buildCampaignInputPure } from '../buildCampaignInput';
import {
  OBJECTIVES,
  OFFER_TYPES,
  CTA_OPTIONS,
  LANGUAGES,
  REGIONAL_STYLES,
  CAMPAIGN_STYLES,
  OCCASIONS,
  TOTAL_STEPS,
  ESTIMATED_CAMPAIGN_GENERATION_CREDITS,
  VERTICAL_OBJECTIVES,
  VERTICAL_CTAS,
  VERTICAL_OFFER_TYPES,
} from '../constants';
import type { Business, Product, Campaign, LanguageCode, RegionalStyle } from '@/types';
import { MascotScene } from '@/components/mascot/MascotScene';

const STEP_TITLES = [
  'Objective',
  'Product & Photos',
  'Offer & Duration',
  'Audience',
  'Call to Action',
  'Language & Regional Style',
  'Campaign Style',
  'Review & Generate',
];

// MVP restricts the wizard to en/te/te_en. If Business Brain has an out-of-scope
// value (hi/hi_en) stored, fall back to English rather than exposing it.
function normalizeLanguage(value: LanguageCode | undefined): LanguageCode {
  if (value === 'en' || value === 'te' || value === 'te_en') return value;
  return 'en';
}

// MVP restricts the wizard to neutral/hyderabadi.
function normalizeRegionalStyle(value: RegionalStyle | undefined): RegionalStyle {
  if (value === 'neutral' || value === 'hyderabadi') return value;
  return 'neutral';
}

interface CampaignWizardProps {
  userId: string;
}

export function CampaignWizard({ userId }: CampaignWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // Phase 12: a browser refresh mid-generation must resume the live
  // progress view for the actual in-flight campaign, not silently drop
  // the user back to the empty form — that would hide a real, already
  // credit-reserved generation in progress and invite a genuine duplicate
  // attempt (a second reservation for what the user believes is a first
  // try). The in-flight campaignId is mirrored into the URL
  // (?generating=<campaignId>) precisely so a full page reload can
  // recover it; GenerationProgress itself always re-derives status from
  // the authoritative Firestore document, never from anything client-held.
  const initialGeneratingId = searchParams.get('generating');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const [state, setState] = useState<CampaignWizardState>(createInitialWizardState());
  const [stepError, setStepError] = useState<string | null>(null);

  const [phase, setPhase] = useState<'form' | 'submitting' | 'generating' | 'failed'>(
    initialGeneratingId ? 'generating' : 'form'
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatingCampaignId, setGeneratingCampaignId] = useState<string | null>(
    initialGeneratingId
  );

  // One idempotency key per wizard attempt; regenerated only if the user
  // explicitly retries after a failure (a fresh attempt), never on re-render.
  const idempotencyKeyRef = useRef<string>(uuidv4());
  const submitLockRef = useRef(false);

  const business = useMemo(
    () => businesses.find((b) => b.businessId === businessId) || null,
    [businesses, businessId]
  );

  // Phase 30: only show objectives/CTAs/offer types appropriate for this
  // business's vertical — e.g. a salon must never be offered "Book a
  // Table". Defaults to restaurant's list if the business hasn't loaded
  // yet, matching this app's existing restaurant-first behavior.
  const vertical = business?.category || 'restaurant';
  const availableObjectives = useMemo(
    () => OBJECTIVES.filter((o) => VERTICAL_OBJECTIVES[vertical].includes(o.value)),
    [vertical]
  );
  const availableCTAs = useMemo(
    () => CTA_OPTIONS.filter((c) => VERTICAL_CTAS[vertical].includes(c.value)),
    [vertical]
  );
  const availableOfferTypes = useMemo(
    () => OFFER_TYPES.filter((o) => VERTICAL_OFFER_TYPES[vertical].includes(o.value)),
    [vertical]
  );
  // Phase 31: the "product" step is really "what is this campaign about" —
  // a dish, a service, or a property listing, depending on vertical.
  const itemNoun =
    vertical === 'salon' ? 'service' : vertical === 'real_estate' ? 'listing' : 'product';
  const itemNounPlural =
    vertical === 'salon' ? 'services' : vertical === 'real_estate' ? 'listings' : 'products';

  // The credits balance shown in this wizard is informational display
  // only (Phase 12: frontend state must not override backend state) — the
  // actual reservation gate is always re-checked server-side in
  // generateCampaignStrategy. refreshCredits() is called both on initial
  // load and after a failed generation attempt, so a stale pre-attempt
  // number is never shown as if it still reflects reality: whether credits
  // were reserved-then-refunded, or never reserved at all, the displayed
  // balance is re-fetched from the server rather than assumed.
  const refreshCredits = useCallback(async () => {
    try {
      const [subscription, usage] = await Promise.all([
        subscriptionService.getByUserId(userId).catch(() => null),
        usageService.getCurrentPeriod(userId).catch(() => null),
      ]);
      const creditsIncluded = subscription?.creditsIncluded ?? 100;
      const creditsUsed = usage?.creditsUsed ?? 0;
      setCreditsRemaining(creditsIncluded - creditsUsed);
    } catch (err) {
      console.error('Failed to refresh credit balance:', err);
    }
  }, [userId]);

  // Load businesses + credit balance
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const businessesData = await businessService.getByUserId(userId);
        if (cancelled) return;
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          setBusinessId(businessesData[0]!.businessId);
        }
        await refreshCredits();
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError("Couldn't load your business. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshCredits]);

  // Load products + prefill Business Brain defaults once a business is known
  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    async function loadProducts() {
      try {
        const productsData = await productService.listByBusiness(business!.businessId);
        if (!cancelled) setProducts(productsData);
      } catch (err) {
        console.error(err);
        if (!cancelled) showToast("Couldn't load your products. Please try again.", 'error');
      }
    }
    void loadProducts();

    const bb = business.businessBrain;
    setState((prev) => ({
      ...prev,
      audience: {
        ...prev.audience,
        localities:
          prev.audience.localities.length > 0
            ? prev.audience.localities
            : bb?.audience?.localities?.length
              ? bb.audience.localities
              : [business.location.locality || business.location.city],
        ageMin: bb?.audience?.ageRange?.min
          ? String(bb.audience.ageRange.min)
          : prev.audience.ageMin,
        ageMax: bb?.audience?.ageRange?.max
          ? String(bb.audience.ageRange.max)
          : prev.audience.ageMax,
      },
      primaryLanguage: prev.primaryLanguage ?? normalizeLanguage(bb?.localization?.primaryLanguage),
      regionalStyle: prev.regionalStyle ?? normalizeRegionalStyle(bb?.localization?.regionalStyle),
    }));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.businessId]);

  const goNext = useCallback(() => {
    setStepError(null);
    setState((prev) => ({ ...prev, step: Math.min(TOTAL_STEPS, prev.step + 1) }));
  }, []);

  const goBack = useCallback(() => {
    setStepError(null);
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }, []);

  const validateAndNext = useCallback(() => {
    const s = state;
    switch (s.step) {
      case 1:
        if (!s.objective) return setStepError('Please select an objective.');
        break;
      case 2:
        if (!s.selectedProductId) return setStepError('Please select a product.');
        if (s.photos.length < 1) return setStepError('Please upload at least 1 photo.');
        if (s.photos.length > 5) return setStepError('You can upload up to 5 photos.');
        break;
      case 3: {
        if (!s.offer.headline.trim()) return setStepError('Please enter an offer headline.');
        if (!s.offer.type) return setStepError('Please select an offer type.');
        const price = Number(s.offer.price);
        if (!s.offer.price || Number.isNaN(price) || price <= 0) {
          return setStepError('Please enter a valid price.');
        }
        if (s.offer.originalPrice) {
          const original = Number(s.offer.originalPrice);
          if (Number.isNaN(original) || original <= 0) {
            return setStepError('Please enter a valid original price.');
          }
          if ((s.offer.type === 'percentage' || s.offer.type === 'fixed') && original <= price) {
            return setStepError('Original price must be higher than the discounted price.');
          }
          if (s.offer.type === 'percentage') {
            const pct = ((original - price) / original) * 100;
            if (pct <= 0 || pct > 100) {
              return setStepError('Discount percentage must be between 1% and 100%.');
            }
          }
        } else if (s.offer.type === 'percentage' || s.offer.type === 'fixed') {
          return setStepError('Please enter the original price to calculate the discount.');
        }
        if (!s.duration.start || !s.duration.end)
          return setStepError('Please select a start and end date.');
        if (new Date(s.duration.end) < new Date(s.duration.start)) {
          return setStepError('End date must be on or after the start date.');
        }
        break;
      }
      case 4: {
        if (s.audience.localities.length === 0)
          return setStepError('Please add at least one locality.');
        if (s.audience.localities.length > 10)
          return setStepError('Please limit to 10 localities.');
        const min = Number(s.audience.ageMin);
        const max = Number(s.audience.ageMax);
        if (Number.isNaN(min) || min < 18) return setStepError('Minimum age must be 18 or older.');
        if (Number.isNaN(max) || max > 80) return setStepError('Maximum age must be 80 or under.');
        if (max < min) return setStepError('Maximum age must be greater than minimum age.');
        break;
      }
      case 5:
        if (!s.cta) return setStepError('Please select a call to action.');
        break;
      case 6:
        if (!s.primaryLanguage) return setStepError('Please select a language.');
        if (!s.regionalStyle) return setStepError('Please select a regional style.');
        break;
      case 7:
        if (!s.campaignStyle) return setStepError('Please select a campaign style.');
        break;
      default:
        break;
    }
    goNext();
    return undefined;
  }, [state, goNext]);

  const handlePhotoUploaded = (asset: Asset) => {
    if (!asset.previewUrl) {
      showToast("Photo uploaded but couldn't be previewed. Please try again.", 'error');
      return;
    }
    setState((prev) => ({
      ...prev,
      photos: [
        ...prev.photos,
        { assetId: asset.assetId, url: asset.previewUrl!, storagePath: asset.storagePath },
      ],
    }));
  };

  const removePhoto = (assetId: string) => {
    setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.assetId !== assetId) }));
  };

  const buildCampaignInput = useCallback(() => {
    if (!business) return null;
    return buildCampaignInputPure(business, state, idempotencyKeyRef.current);
  }, [business, state]);

  const handleGenerate = useCallback(async () => {
    if (submitLockRef.current) return; // double-click protection
    const input = buildCampaignInput();
    if (!business || !input) {
      setSubmitError('Please complete all required fields before generating.');
      return;
    }
    if (creditsRemaining !== null && creditsRemaining < ESTIMATED_CAMPAIGN_GENERATION_CREDITS) {
      setSubmitError('You don’t have enough credits to generate this campaign.');
      return;
    }

    submitLockRef.current = true;
    setPhase('submitting');
    setSubmitError(null);

    try {
      const response = await callFunction<typeof input, { campaignId: string; campaign: Campaign }>(
        {
          functionName: 'generateCampaignStrategy',
          data: input,
        }
      );
      setGeneratingCampaignId(response.campaignId);
      setPhase('generating');
      // Mirror into the URL so a refresh resumes this exact campaign's
      // progress view instead of resetting to the empty form.
      router.replace(`/campaigns/new?generating=${response.campaignId}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '';
      // executeWithUsageControl (functions/src/services/usageControl.ts)
      // always attempts a refund before re-throwing on failure, so by the
      // time this catch runs, credits reserved for this attempt were
      // either never taken (e.g. rejected before reservation) or
      // reserved-then-refunded — never left charged. "Not charged" would
      // be an inaccurate claim in the second case; "returned" is accurate
      // in both (Phase 12: never assert a financial claim the frontend
      // hasn't verified from backend state — refreshCredits() below is
      // what actually lets the user see the real current balance rather
      // than trusting this wording alone).
      let friendly = 'We couldn’t start this campaign. Any reserved credits have been returned.';
      if (message.toLowerCase().includes('credit')) {
        friendly = "You don't have enough credits for this campaign.";
      } else if (message.toLowerCase().includes('subscription')) {
        friendly =
          'Your current plan doesn’t support this action. Please upgrade your subscription.';
      }
      setSubmitError(friendly);
      setPhase('failed');
      // Allow a genuine retry (new attempt) with a fresh idempotency key.
      idempotencyKeyRef.current = uuidv4();
      submitLockRef.current = false;
      void refreshCredits();
    }
  }, [buildCampaignInput, business, creditsRemaining, refreshCredits, router]);

  const handleSettled = useCallback(
    (campaign: Campaign) => {
      if (campaign.status === 'failed') {
        // Truth Check failure is a completed generation that didn't pass
        // verification — credits for that attempt are charged, not
        // refunded (functions/src/functions/campaigns/
        // generateCampaignStrategy.ts, consistent with regeneration's
        // behavior). Any other failure reason is a pipeline exception,
        // which IS refunded. Phase 12: never assert a financial outcome
        // the backend hasn't actually reported — campaign.error.code is
        // the authoritative signal for which case this is.
        const isTruthCheckFailure = campaign.error?.code === 'TRUTH_CHECK_FAILED';
        const fallbackMessage = isTruthCheckFailure
          ? 'Campaign generation completed, but some details could not be verified. Credits for this attempt were used. Please review and try again.'
          : 'Campaign generation failed. Any reserved credits have been returned. Please try again.';
        setSubmitError(campaign.error?.message || fallbackMessage);
        setPhase('failed');
        idempotencyKeyRef.current = uuidv4();
        submitLockRef.current = false;
        void refreshCredits();
        // Clear the resumable-generation marker — this attempt reached a
        // terminal failed state, so a later refresh must land on the
        // (now-editable) form again, not try to resume a dead campaign.
        router.replace('/campaigns/new');
        return;
      }
      router.push(`/campaigns/${campaign.campaignId}?created=1`);
    },
    [router, refreshCredits]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <p className="text-error-600">{loadError}</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="bg-bg-primary min-h-screen p-8 text-center">
        <p className="text-neutral-500">You need to set up a business before creating campaigns.</p>
        <a href="/onboarding" className="mt-4 inline-block">
          <Button>Set up business</Button>
        </a>
      </div>
    );
  }

  if (phase === 'generating' && generatingCampaignId) {
    return <GenerationProgress campaignId={generatingCampaignId} onSettled={handleSettled} />;
  }

  const selectedProduct = products.find((p) => p.productId === state.selectedProductId) || null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Create Campaign</h1>
        <p className="mt-1 text-neutral-500">
          Step {state.step} of {TOTAL_STEPS}: {STEP_TITLES[state.step - 1]}
        </p>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuenow={state.step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`Step ${state.step} of ${TOTAL_STEPS}`}
        >
          <div
            className="bg-brand-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {businesses.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-900">Business</label>
          <select
            value={businessId || ''}
            onChange={(e) => setBusinessId(e.target.value)}
            className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
          >
            {businesses.map((b) => (
              <option key={b.businessId} value={b.businessId}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.step === 1 && (
        <MascotScene
          pose={state.objective ? 'idea' : 'curious'}
          size="sm"
          message={state.objective ? 'Got it.' : 'What are we promoting today?'}
          className="mb-4"
        />
      )}

      {state.step === 8 && (
        <MascotScene pose="idea" size="sm" message="Ready when you are." className="mb-4" />
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {state.step === 1 && (
          <fieldset>
            <legend className="sr-only">Objective</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {availableObjectives.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, objective: o.value }))}
                  aria-pressed={state.objective === o.value}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    state.objective === o.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <p className="font-medium text-neutral-900">{o.label}</p>
                  <p className="mt-1 text-sm text-neutral-500">{o.description}</p>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {state.step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-neutral-900">Select a {itemNoun}</h3>
              {products.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center">
                  <p className="text-neutral-500">You don&apos;t have any {itemNounPlural} yet.</p>
                  <a href="/products/new" className="mt-3 inline-block">
                    <Button variant="outline">Add a product</Button>
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {products.map((p) => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() =>
                        setState((prev) => ({ ...prev, selectedProductId: p.productId }))
                      }
                      aria-pressed={state.selectedProductId === p.productId}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        state.selectedProductId === p.productId
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {p.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0].url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900">{p.name}</p>
                        <p className="text-sm text-neutral-500">
                          ₹{p.price.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-1 text-sm font-medium text-neutral-900">Campaign photos</h3>
              <p className="mb-3 text-sm text-neutral-500">
                Upload 1 to 5 photos for this campaign.
              </p>
              <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {state.photos.map((photo) => (
                  <div
                    key={photo.assetId}
                    className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Campaign" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.assetId)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {state.photos.length < 5 && business && (
                <ImageUploader
                  key={state.photos.length}
                  userId={userId}
                  businessId={business.businessId}
                  assetType="campaign"
                  onUploadComplete={handlePhotoUploaded}
                  onUploadError={(err) => showToast(err.message, 'error')}
                />
              )}
            </div>
          </div>
        )}

        {state.step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-neutral-900">Offer</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900">Offer type *</label>
                  <select
                    value={state.offer.type || ''}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        offer: { ...prev.offer, type: e.target.value as typeof prev.offer.type },
                      }))
                    }
                    className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                  >
                    <option value="">Select an offer type</option>
                    {availableOfferTypes.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900">Headline *</label>
                  <input
                    value={state.offer.headline}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        offer: { ...prev.offer, headline: e.target.value },
                      }))
                    }
                    type="text"
                    maxLength={100}
                    placeholder="e.g., Weekend Biryani Special"
                    className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      {state.offer.type === 'percentage' || state.offer.type === 'fixed'
                        ? 'Original price (₹)'
                        : 'Original price (₹, optional)'}
                    </label>
                    <input
                      value={state.offer.originalPrice}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          offer: { ...prev.offer, originalPrice: e.target.value },
                        }))
                      }
                      type="number"
                      min="1"
                      placeholder="e.g., 349"
                      className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      {state.offer.type === 'percentage' || state.offer.type === 'fixed'
                        ? 'Price after discount (₹) *'
                        : 'Offer price (₹) *'}
                    </label>
                    <input
                      value={state.offer.price}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          offer: { ...prev.offer, price: e.target.value },
                        }))
                      }
                      type="number"
                      min="1"
                      placeholder="e.g., 299"
                      className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900">
                    Description (optional)
                  </label>
                  <textarea
                    value={state.offer.description}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        offer: { ...prev.offer, description: e.target.value.slice(0, 500) },
                      }))
                    }
                    rows={2}
                    className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900">
                    Terms (optional)
                  </label>
                  <input
                    value={state.offer.terms}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        offer: { ...prev.offer, terms: e.target.value.slice(0, 1000) },
                      }))
                    }
                    type="text"
                    placeholder="e.g., Valid on dine-in only"
                    className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-neutral-900">Duration</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-900">Start date *</label>
                  <input
                    value={state.duration.start}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        duration: { ...prev.duration, start: e.target.value },
                      }))
                    }
                    type="date"
                    className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900">End date *</label>
                  <input
                    value={state.duration.end}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        duration: { ...prev.duration, end: e.target.value },
                      }))
                    }
                    type="date"
                    className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {state.step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900">Localities *</label>
              <p className="mb-1 text-sm text-neutral-500">
                Comma-separated areas you want to reach, e.g. Kondapur, Gachibowli
              </p>
              <input
                value={state.audience.localities.join(', ')}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    audience: {
                      ...prev.audience,
                      localities: e.target.value
                        .split(',')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .slice(0, 10),
                    },
                  }))
                }
                type="text"
                className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-900">
                  Age range (min) *
                </label>
                <input
                  value={state.audience.ageMin}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      audience: { ...prev.audience, ageMin: e.target.value },
                    }))
                  }
                  type="number"
                  min="18"
                  max="80"
                  className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900">
                  Age range (max) *
                </label>
                <input
                  value={state.audience.ageMax}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      audience: { ...prev.audience, ageMax: e.target.value },
                    }))
                  }
                  type="number"
                  min="18"
                  max="80"
                  className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Occasion (optional)
              </label>
              <select
                value={state.audience.occasion}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    audience: {
                      ...prev.audience,
                      occasion: e.target.value as typeof prev.audience.occasion,
                    },
                  }))
                }
                className="focus:ring-brand-500 mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
              >
                <option value="">None</option>
                {OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {state.step === 5 && (
          <fieldset>
            <legend className="sr-only">Call to action</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {availableCTAs.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, cta: c.value }))}
                  aria-pressed={state.cta === c.value}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    state.cta === c.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <p className="font-medium text-neutral-900">{c.label}</p>
                  <p className="mt-1 text-sm text-neutral-500">{c.description}</p>
                </button>
              ))}
            </div>
            {state.cta === 'order_whatsapp' && business?.contact.whatsapp && (
              <p className="mt-3 text-sm text-neutral-500">
                Customers will be directed to WhatsApp ({business.contact.whatsapp}).
              </p>
            )}
          </fieldset>
        )}

        {state.step === 6 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-neutral-900">Language</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, primaryLanguage: l.value }))}
                    aria-pressed={state.primaryLanguage === l.value}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      state.primaryLanguage === l.value
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium text-neutral-900">Regional style</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REGIONAL_STYLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, regionalStyle: r.value }))}
                    aria-pressed={state.regionalStyle === r.value}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      state.regionalStyle === r.value
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {state.step === 7 && (
          <fieldset>
            <legend className="sr-only">Campaign style</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAMPAIGN_STYLES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, campaignStyle: c.value }))}
                  aria-pressed={state.campaignStyle === c.value}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    state.campaignStyle === c.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <p className="font-medium text-neutral-900">{c.label}</p>
                  <p className="mt-1 text-sm text-neutral-500">{c.description}</p>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {state.step === 8 && business && (
          <div className="space-y-5 text-sm">
            <section>
              <h3 className="font-medium text-neutral-900">Business</h3>
              <p className="text-neutral-600">{business.name}</p>
              <p className="text-neutral-500">
                {business.location.locality || business.location.city}, {business.location.state}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Objective</h3>
              <p className="text-neutral-600">
                {OBJECTIVES.find((o) => o.value === state.objective)?.label}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Product</h3>
              <p className="text-neutral-600">{selectedProduct?.name}</p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Photos</h3>
              <p className="text-neutral-600">
                {state.photos.length} photo{state.photos.length === 1 ? '' : 's'}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Offer</h3>
              <p className="text-neutral-600">
                {OFFER_TYPES.find((o) => o.value === state.offer.type)?.label} &mdash;{' '}
                {state.offer.headline}
              </p>
              <p className="text-neutral-500">
                ₹{state.offer.price}
                {state.offer.originalPrice ? ` (was ₹${state.offer.originalPrice})` : ''}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Duration</h3>
              <p className="text-neutral-600">
                {state.duration.start} to {state.duration.end}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Audience</h3>
              <p className="text-neutral-600">{state.audience.localities.join(', ')}</p>
              <p className="text-neutral-500">
                Ages {state.audience.ageMin}&ndash;{state.audience.ageMax}
                {state.audience.occasion ? ` · ${state.audience.occasion}` : ''}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Call to action</h3>
              <p className="text-neutral-600">
                {CTA_OPTIONS.find((c) => c.value === state.cta)?.label}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Language & regional style</h3>
              <p className="text-neutral-600">
                {LANGUAGES.find((l) => l.value === state.primaryLanguage)?.label} &middot;{' '}
                {REGIONAL_STYLES.find((r) => r.value === state.regionalStyle)?.label}
              </p>
            </section>
            <section>
              <h3 className="font-medium text-neutral-900">Campaign style</h3>
              <p className="text-neutral-600">
                {CAMPAIGN_STYLES.find((c) => c.value === state.campaignStyle)?.label}
              </p>
            </section>

            <section className="bg-brand-50 rounded-lg p-4">
              <h3 className="font-medium text-neutral-900">Credits</h3>
              <p className="text-neutral-600">Current balance: {creditsRemaining ?? '—'} credits</p>
              <p className="text-neutral-600">
                Estimated cost: {ESTIMATED_CAMPAIGN_GENERATION_CREDITS} credits
              </p>
              {creditsRemaining !== null && (
                <p className="text-neutral-600">
                  After generation:{' '}
                  {Math.max(0, creditsRemaining - ESTIMATED_CAMPAIGN_GENERATION_CREDITS)} credits
                  remaining
                </p>
              )}
              {creditsRemaining !== null &&
                creditsRemaining < ESTIMATED_CAMPAIGN_GENERATION_CREDITS && (
                  <div className="mt-2">
                    <p className="text-error-600 font-medium">
                      Not enough credits to generate this campaign.
                    </p>
                    <a href="/billing" className="mt-1 inline-block">
                      <Button variant="outline" size="sm">
                        View billing options
                      </Button>
                    </a>
                  </div>
                )}
            </section>

            {submitError && <p className="text-error-600">{submitError}</p>}
          </div>
        )}

        {stepError && <p className="text-error-600 mt-4 text-sm">{stepError}</p>}

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={state.step === 1 || phase === 'submitting'}
          >
            Back
          </Button>
          {state.step < TOTAL_STEPS ? (
            <Button type="button" onClick={validateAndNext}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleGenerate}
              loading={phase === 'submitting'}
              disabled={
                phase === 'submitting' ||
                (creditsRemaining !== null &&
                  creditsRemaining < ESTIMATED_CAMPAIGN_GENERATION_CREDITS)
              }
            >
              {phase === 'submitting' ? 'Starting generation...' : 'Generate Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
