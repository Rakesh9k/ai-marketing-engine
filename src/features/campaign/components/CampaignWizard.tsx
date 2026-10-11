'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { computeCreditsRemaining } from '@/lib/credits';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  businessService,
  productService,
  subscriptionService,
  usageService,
  campaignService,
} from '@/services/database';
import { callFunction } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { ImageUploader } from '@/features/asset/components/ImageUploader';
import type { Asset } from '@/features/asset/services/assetService';
import { GenerationProgress } from './GenerationProgress';
import { ConceptSelectorModal, type SelectedConcept } from './ConceptSelectorModal';
import { trackCreativeEvent } from '@/lib/analytics/trackEvent';
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
  TOTAL_STEPS,
  ESTIMATED_CAMPAIGN_GENERATION_CREDITS,
  VERTICAL_OBJECTIVES,
  VERTICAL_CTAS,
  VERTICAL_OFFER_TYPES,
} from '../constants';
import type { Business, Product, Campaign } from '@/types';
import { MascotScene } from '@/components/mascot/MascotScene';
import { MitraMark } from '@/components/ui/MitraMark';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { MagneticWrap } from '@/components/motion/MagneticWrap';
import { SavedStylePicker } from '@/features/style/components/SavedStylePicker';
import { describeError } from '@/lib/errors/classifyError';
import { computeOfferFieldErrors } from '../offerFieldErrors';
import { applyQuickIdea, quickIdeasFor, type QuickIdea } from '../quickIdeas';
import {
  defaultLocalizationFor,
  normalizeRegionalStyle,
  isPlaceholderAgeRange,
  ownerStatedLocalization,
  regionalStylesFor,
} from '../localizationDefaults';

const STEP_TITLES = [
  'Creative Type',
  'Objective',
  'Creative Template',
  'Product & Photos',
  'Offer & Duration',
  'Audience',
  'Call to Action',
  'Language & Regional Style',
  'Campaign Style',
  'Review & Generate',
];

const MASCOT_MESSAGES: Record<
  number,
  { pose: 'curious' | 'idea' | 'explain' | 'cheer' | 'thinking'; text: string }
> = {
  1: { pose: 'curious', text: 'What type of creative are we building today?' },
  2: { pose: 'idea', text: 'Got it. What are we promoting today?' },
  3: { pose: 'idea', text: "Let's pick a layout tailored for your goal." },
  4: { pose: 'curious', text: "Show me the product or service you're featuring." },
  5: { pose: 'idea', text: "Set a clear offer that catches your customer's eye." },
  6: { pose: 'thinking', text: "Now I'm shaping this for your target audience." },
  7: { pose: 'curious', text: 'What action should your customers take next?' },
  8: { pose: 'idea', text: 'Speak directly to your local audience in their language.' },
  9: { pose: 'explain', text: 'Turning your idea into something people will want to see.' },
  10: { pose: 'cheer', text: 'Almost ready. Review your campaign details before launch!' },
};

interface CampaignWizardProps {
  userId: string;
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p id={id} role="alert" className="text-error-600 mt-1 text-xs font-medium">
      {errors[0]}
    </p>
  );
}

export function CampaignWizard({ userId }: CampaignWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  const initialGeneratingId = searchParams.get('generating');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const [state, setState] = useState<CampaignWizardState>(createInitialWizardState());
  const [stepError, setStepError] = useState<string | null>(null);
  // Offer-step field errors appear after the first failed attempt, then follow the inputs live.
  const [offerErrorsShown, setOfferErrorsShown] = useState(false);
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<SelectedConcept | null>(null);

  const [phase, setPhase] = useState<'form' | 'submitting' | 'generating' | 'failed'>(
    initialGeneratingId ? 'generating' : 'form'
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatingCampaignId, setGeneratingCampaignId] = useState<string | null>(
    initialGeneratingId
  );

  const idempotencyKeyRef = useRef<string>(uuidv4());
  const submitLockRef = useRef(false);

  const business = useMemo(
    () => businesses.find((b) => b.businessId === businessId) || null,
    [businesses, businessId]
  );

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

  const itemNoun =
    vertical === 'salon' ? 'service' : vertical === 'real_estate' ? 'listing' : 'product';
  const itemNounPlural =
    vertical === 'salon' ? 'services' : vertical === 'real_estate' ? 'listings' : 'products';

  const refreshCredits = useCallback(async () => {
    try {
      const [subscription, usage] = await Promise.all([
        subscriptionService.getByUserId(userId).catch(() => null),
        usageService.getCurrentPeriod(userId).catch(() => null),
      ]);
      setCreditsRemaining(computeCreditsRemaining(subscription, usage));
    } catch (err) {
      console.error('Failed to refresh credit balance:', err);
    }
  }, [userId]);

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

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    async function loadProducts() {
      try {
        const productsData = await productService.listByBusiness(business!.businessId);
        if (!cancelled) {
          setProducts(productsData || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) showToast("Couldn't load products. Please try again.", 'error');
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
        // The Brain's 18-65 is the placeholder Mitra stores for a new Brain, not an audience the owner chose.
        ageMin:
          bb?.audience?.ageRange?.min && !isPlaceholderAgeRange(bb.audience.ageRange)
            ? String(bb.audience.ageRange.min)
            : prev.audience.ageMin,
        ageMax:
          bb?.audience?.ageRange?.max && !isPlaceholderAgeRange(bb.audience.ageRange)
            ? String(bb.audience.ageRange.max)
            : prev.audience.ageMax,
      },
      // What the owner stored is kept as it is (hi_en stays hi_en); only a missing preference falls
      // back to the default for the business's own place.
      primaryLanguage:
        prev.primaryLanguage ??
        ownerStatedLocalization(bb).primaryLanguage ??
        defaultLocalizationFor(business.location).primaryLanguage,
      regionalStyle:
        prev.regionalStyle ??
        ownerStatedLocalization(bb).regionalStyle ??
        defaultLocalizationFor(business.location).regionalStyle,
    }));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.businessId]);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    async function loadTemplates() {
      try {
        const templatesRes = await callFunction<any, { templates: any[]; recommendation?: any }>({
          functionName: 'listCreativeTemplates',
          data: {
            type: state.type || 'post',
            // NOT the wizard's campaign objective: its values (weekend_offer, new_dish, ...) are not
            // the creative objectives this callable validates (awareness, promotion, ...), so sending it
            // made every request 400 and left the template list empty.
            vertical: business!.category,
            businessId: business!.businessId,
          },
        });
        if (!cancelled) {
          setTemplates(templatesRes?.templates || []);
          setRecommendation(templatesRes?.recommendation || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) showToast("Couldn't load templates. Please try again.", 'error');
      }
    }
    void loadTemplates();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.businessId, business?.category, state.type]);

  const chosenProductPrice = useMemo(
    () => products.find((p) => p.productId === state.selectedProductId)?.price,
    [products, state.selectedProductId]
  );
  const offerErrors = useMemo(
    () => (offerErrorsShown ? computeOfferFieldErrors(state, chosenProductPrice) : {}),
    [offerErrorsShown, state, chosenProductPrice]
  );

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
      case 2:
        if (!s.objective) return setStepError('Please select an objective.');
        break;
      case 3:
        if (!s.templateId) return setStepError('Please select a creative template.');
        break;
      case 4: {
        if (!s.selectedProductId) return setStepError('Please select a product.');
        const chosen = products.find((p) => p.productId === s.selectedProductId);
        const hasPhoto = s.photos.length > 0 || Boolean(chosen?.images?.[0]?.url);
        if (!hasPhoto) return setStepError('Please upload at least 1 photo.');
        if (s.photos.length > 5) return setStepError('You can upload up to 5 photos.');
        break;
      }
      case 5: {
        if (!s.offer.headline.trim()) return setStepError('Please enter an offer headline.');
        if (!s.offer.type) return setStepError('Please select an offer type.');
        // The same rules the callable enforces (shared validator), shown next to the offending field.
        const fieldErrors = computeOfferFieldErrors(
          s,
          products.find((p) => p.productId === s.selectedProductId)?.price
        );
        if (Object.keys(fieldErrors).length > 0) {
          setOfferErrorsShown(true);
          return setStepError(Object.values(fieldErrors)[0]![0]!);
        }
        setOfferErrorsShown(false);
        break;
      }
      case 6: {
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
      case 7:
        if (!s.cta) return setStepError('Please select a call to action.');
        break;
      case 8:
        if (!s.primaryLanguage) return setStepError('Please select a language.');
        if (!s.regionalStyle) return setStepError('Please select a regional style.');
        break;
      case 9:
        if (!s.campaignStyle) return setStepError('Please select a campaign style.');
        break;
      default:
        break;
    }
    goNext();
    return undefined;
  }, [state, goNext, products]);

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
    if (submitLockRef.current) return;
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
          timeoutMs: 540_000,
        }
      );
      setGeneratingCampaignId(response.campaignId);
      setPhase('generating');
      router.replace(`/campaigns/new?generating=${response.campaignId}`);
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = err instanceof Error ? err.message : '';

      if (code.includes('deadline-exceeded')) {
        try {
          const existing = await campaignService.getByIdempotencyKey(
            idempotencyKeyRef.current,
            userId
          );
          if (existing) {
            setGeneratingCampaignId(existing.campaignId);
            setPhase('generating');
            router.replace(`/campaigns/new?generating=${existing.campaignId}`);
            return;
          }
        } catch (lookupErr) {
          console.error('Failed to recover campaign after client timeout:', lookupErr);
        }
        setSubmitError(
          'This is taking longer than expected. We’re still checking on it — please wait a moment and refresh.'
        );
        setPhase('failed');
        void refreshCredits();
        return;
      }

      let friendly = 'We couldn’t start this campaign. Any reserved credits have been returned.';
      if (message.toLowerCase().includes('credit')) {
        friendly = "You don't have enough credits for this campaign.";
      } else if (message.toLowerCase().includes('subscription')) {
        friendly =
          'Your current plan doesn’t support this action. Please choose a plan or credit pack on the Billing page.';
      } else {
        // Say what actually happened (offline / server / session / rate limit) rather than a
        // generic failure. The form state is kept, and reserved credits are returned.
        const copy = describeError(err, 'start this campaign', { workKept: true });
        if (copy.kind !== 'unknown' && copy.kind !== 'validation') {
          friendly = `${copy.message} Any reserved credits have been returned.`;
        }
      }
      setSubmitError(friendly);
      setPhase('failed');
      idempotencyKeyRef.current = uuidv4();
      submitLockRef.current = false;
      void refreshCredits();
    }
  }, [buildCampaignInput, business, creditsRemaining, refreshCredits, router, userId]);

  const handleSettled = useCallback(
    (campaign: Campaign) => {
      if (campaign.status === 'failed') {
        const isTruthCheckFailure = campaign.error?.code === 'TRUTH_CHECK_FAILED';
        const fallbackMessage = isTruthCheckFailure
          ? 'Campaign generation completed, but some details could not be verified. Credits for this attempt were used. Please review and try again.'
          : 'Campaign generation failed. Any reserved credits have been returned. Please try again.';
        setSubmitError(campaign.error?.message || fallbackMessage);
        setPhase('failed');
        idempotencyKeyRef.current = uuidv4();
        submitLockRef.current = false;
        void refreshCredits();
        router.replace('/campaigns/new');
        return;
      }
      router.push(`/campaigns/${campaign.campaignId}?created=1`);
    },
    [router, refreshCredits]
  );

  // Quick ideas start a campaign; they never create a fact (see quickIdeas.ts).
  const startFromIdea = (idea: QuickIdea) =>
    setState((prev) => applyQuickIdea(prev, idea, defaultLocalizationFor(business?.location)));

  if (loading) {
    return <PageSkeleton variant="form" />;
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
        <p className="text-text-secondary">
          You need to set up a business before creating campaigns.
        </p>
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
  const currentMascot = MASCOT_MESSAGES[state.step] || {
    pose: 'idea',
    text: 'Working together with Mitra.',
  };

  const currentPreviewPhoto = state.photos[0]?.url || selectedProduct?.images?.[0]?.url || null;

  const currentCTAObj = CTA_OPTIONS.find((c) => c.value === state.cta);

  // The preview must only state a discount the owner's own prices support (no invented "20% OFF").
  const previewPrice = Number(state.offer.price);
  const previewOriginal = Number(state.offer.originalPrice);
  const previewDiscountLabel =
    previewOriginal > 0 && previewPrice > 0 && previewPrice < previewOriginal
      ? `${Math.round((1 - previewPrice / previewOriginal) * 100)}% OFF`
      : 'SPECIAL OFFER';

  const workflowStages = [
    { label: '1. Create', active: state.step <= 3 },
    { label: '2. Customize', active: state.step >= 4 && state.step <= 6 },
    { label: '3. Preview', active: state.step >= 7 && state.step <= 9 },
    { label: '4. Generate', active: state.step === 10 },
  ];

  const optionCardClass = (isSelected: boolean) =>
    `cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0 ${
      isSelected
        ? 'border-brand-600 bg-brand-50 shadow-sm ring-1 ring-brand-600/30 dark:bg-amber-950/40 dark:border-amber-500'
        : 'border-border-light bg-surface hover:bg-bg-secondary'
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      {/* Top Header & Subheader Bar */}
      <div className="mb-6 rounded-2xl border border-amber-500/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Create Campaign</h1>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                Mitra 3.1 Pro Live
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Transform your intent into multi-format marketing campaigns powered by local
              intelligence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Business Switcher */}
            {businesses.length > 1 && (
              <select
                value={businessId || ''}
                onChange={(e) => setBusinessId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {businesses.map((b) => (
                  <option key={b.businessId} value={b.businessId}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Credit Counter Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span>⚡</span>
              <span>{creditsRemaining !== null ? `${creditsRemaining} Credits` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Quick Campaign Starter Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
          <span className="text-xs font-medium text-slate-400">Quick Ideas:</span>
          {quickIdeasFor(business?.category).map((idea) => (
            <button
              key={idea.id}
              type="button"
              onClick={() => startFromIdea(idea)}
              className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-amber-500/50 hover:bg-slate-700 hover:text-white"
            >
              {idea.label}
            </button>
          ))}
        </div>

        {/* Horizontal Workflow Stepper */}
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-800/60 pt-3 text-center text-xs">
          {workflowStages.map((stage) => (
            <div
              key={stage.label}
              className={`rounded-lg py-1.5 font-medium transition-all ${
                stage.active
                  ? 'bg-amber-500 font-semibold text-slate-950 shadow-sm'
                  : 'bg-slate-800/50 text-slate-400'
              }`}
            >
              {stage.label}
            </div>
          ))}
        </div>
      </div>

      {/* 3-Column Studio Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ============================================================ */}
        {/* COLUMN 1: Step Inputs & Wizard Form Controls (5 cols)        */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="border-border-light bg-surface flex-1 rounded-2xl border p-6 shadow-md">
            {/* Header step title */}
            <div className="border-border-light mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-brand-600 text-xs font-semibold tracking-wider uppercase">
                  Step {state.step} of {TOTAL_STEPS}
                </span>
                <h2 className="text-text-primary text-xl font-bold tracking-tight">
                  {STEP_TITLES[state.step - 1]}
                </h2>
              </div>
              <MitraMark size="sm" decorative />
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={state.step}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {/* STEP 1: Creative Type */}
                {state.step === 1 && (
                  <div className="space-y-4">
                    <p className="text-text-secondary text-sm">
                      Select the format for your campaign.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setState({ ...state, type: 'post', templateId: null })}
                        aria-pressed={state.type === 'post'}
                        className={optionCardClass(state.type === 'post')}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <h3 className="text-text-primary text-base font-semibold">Post</h3>
                          {state.type === 'post' && (
                            <span className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-xs">
                          Single image 1:1 feed creative.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setState({ ...state, type: 'reel', templateId: null })}
                        aria-pressed={state.type === 'reel'}
                        className={optionCardClass(state.type === 'reel')}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <h3 className="text-text-primary text-base font-semibold">Reel</h3>
                          {state.type === 'reel' && (
                            <span className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-xs">
                          Vertical 9:16 story & reel video.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Objective */}
                {state.step === 2 && (
                  <fieldset>
                    <legend className="sr-only">Objective</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {availableObjectives.map((o) => {
                        const isSelected = state.objective === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setState((prev) => ({ ...prev, objective: o.value }))}
                            aria-pressed={isSelected}
                            className={optionCardClass(isSelected)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-text-primary text-sm font-medium">{o.label}</p>
                              {isSelected && (
                                <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-text-secondary mt-1 text-xs">{o.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* STEP 3: Template */}
                {state.step === 3 && (
                  <fieldset>
                    <legend className="sr-only">Creative Template</legend>
                    <div className="space-y-4">
                      {templates.length === 0 && (
                        <p className="text-text-secondary text-xs">Loading templates...</p>
                      )}

                      {recommendation?.recommended && (
                        <div className="border-brand-200/60 bg-brand-50 rounded-xl border p-4">
                          <h3 className="text-brand-700 mb-1 text-xs font-semibold tracking-wider uppercase">
                            Mitra Recommends
                          </h3>
                          <p className="text-brand-600 mb-3 text-xs font-medium">
                            {recommendation.recommended.reason.message}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setState((prev) => ({
                                ...prev,
                                templateId: recommendation.recommended.templateId,
                              }));
                              trackCreativeEvent({
                                eventType: 'creative_template_selected',
                                businessId: business!.businessId,
                                templateId: recommendation.recommended.templateId,
                                creativeType: state.type || 'post',
                                objective: state.objective || undefined,
                              });
                            }}
                            aria-pressed={
                              state.templateId === recommendation.recommended.templateId
                            }
                            className={optionCardClass(
                              state.templateId === recommendation.recommended.templateId
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-text-primary text-sm font-semibold">
                                🔥 {recommendation.recommended.displayName}
                              </p>
                              {state.templateId === recommendation.recommended.templateId && (
                                <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-text-secondary mt-1 text-xs">
                              {recommendation.recommended.description}
                            </p>
                          </button>
                        </div>
                      )}

                      {templates.length > 0 && (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {templates
                            .filter((t) => t.id !== recommendation?.recommended?.templateId)
                            .map((t) => {
                              const isSelected = state.templateId === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setState((prev) => ({ ...prev, templateId: t.id }));
                                    trackCreativeEvent({
                                      eventType: 'creative_template_selected',
                                      businessId: business!.businessId,
                                      templateId: t.id,
                                      creativeType: state.type || 'post',
                                      objective: state.objective || undefined,
                                    });
                                  }}
                                  aria-pressed={isSelected}
                                  className={optionCardClass(isSelected)}
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-text-primary text-xs font-semibold">
                                      {t.name}
                                    </p>
                                    {isSelected && (
                                      <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-text-secondary mt-1 line-clamp-2 text-xs">
                                    {t.description}
                                  </p>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <SavedStylePicker
                        businessId={businessId}
                        value={state.styleId}
                        onChange={(styleId) => setState((prev) => ({ ...prev, styleId }))}
                      />
                    </div>
                  </fieldset>
                )}

                {/* STEP 4: Product & Photos */}
                {state.step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-text-primary mb-2 text-xs font-semibold tracking-wider uppercase">
                        Select a {itemNoun}
                      </h3>
                      {products.length === 0 ? (
                        <div className="border-border-medium rounded-xl border border-dashed p-4 text-center">
                          <p className="text-text-secondary text-xs">No {itemNounPlural} found.</p>
                          <a href="/products/new" className="mt-2 inline-block">
                            <Button variant="outline" size="sm">
                              Add a {itemNoun}
                            </Button>
                          </a>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {products.map((p) => {
                            const isSelected = state.selectedProductId === p.productId;
                            return (
                              <button
                                key={p.productId}
                                type="button"
                                onClick={() =>
                                  setState((prev) => {
                                    const newPhotos =
                                      prev.photos.length === 0 && p.images?.[0]
                                        ? [
                                            {
                                              assetId: p.productId,
                                              url: p.images[0].url,
                                              storagePath: p.images[0].storagePath || '',
                                            },
                                          ]
                                        : prev.photos;
                                    return {
                                      ...prev,
                                      selectedProductId: p.productId,
                                      photos: newPhotos,
                                    };
                                  })
                                }
                                aria-pressed={isSelected}
                                className={`flex items-center gap-2.5 ${optionCardClass(isSelected)}`}
                              >
                                <div className="bg-bg-tertiary h-10 w-10 shrink-0 overflow-hidden rounded-md">
                                  {p.images?.[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={p.images[0].url}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-text-primary truncate text-xs font-semibold">
                                    {p.name}
                                  </p>
                                  <p className="text-text-secondary text-xs">
                                    ₹{p.price.toLocaleString('en-IN')}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-text-primary mb-1 text-xs font-semibold tracking-wider uppercase">
                        Campaign photos
                      </h3>
                      <p className="text-text-secondary mb-2 text-xs">
                        Upload 1 to 5 photos for this campaign.
                      </p>
                      <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        <AnimatePresence>
                          {state.photos.map((photo) => (
                            <motion.div
                              key={photo.assetId}
                              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="bg-bg-tertiary group border-border-light relative aspect-square overflow-hidden rounded-lg border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt="Campaign"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(photo.assetId)}
                                aria-label="Remove photo"
                                className="absolute top-1 right-1 cursor-pointer rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                              >
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
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

                {/* STEP 5: Offer & Duration */}
                {state.step === 5 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-text-primary block text-xs font-semibold tracking-wider uppercase">
                        Offer type *
                      </label>
                      <select
                        value={state.offer.type || ''}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            offer: {
                              ...prev.offer,
                              type: e.target.value as typeof prev.offer.type,
                            },
                          }))
                        }
                        className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
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
                      <label className="text-text-primary block text-xs font-semibold tracking-wider uppercase">
                        Headline *
                      </label>
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
                        className="border-border-medium bg-surface text-text-primary placeholder:text-text-tertiary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-text-primary block text-xs font-semibold">
                          Original price (₹)
                        </label>
                        <input
                          value={state.offer.originalPrice}
                          aria-invalid={Boolean(offerErrors['offer.originalPrice'])}
                          aria-describedby={
                            offerErrors['offer.originalPrice']
                              ? 'offer-original-price-error'
                              : undefined
                          }
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              offer: { ...prev.offer, originalPrice: e.target.value },
                            }))
                          }
                          type="number"
                          min="1"
                          placeholder="e.g., 349"
                          className="border-border-medium bg-surface text-text-primary placeholder:text-text-tertiary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        />
                        <FieldError
                          id="offer-original-price-error"
                          errors={offerErrors['offer.originalPrice']}
                        />
                      </div>
                      <div>
                        <label className="text-text-primary block text-xs font-semibold">
                          Offer price (₹) *
                        </label>
                        <input
                          value={state.offer.price}
                          aria-invalid={Boolean(offerErrors['offer.price'])}
                          aria-describedby={
                            offerErrors['offer.price'] ? 'offer-price-error' : undefined
                          }
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              offer: { ...prev.offer, price: e.target.value },
                            }))
                          }
                          type="number"
                          min="1"
                          placeholder="e.g., 299"
                          className="border-border-medium bg-surface text-text-primary placeholder:text-text-tertiary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        />
                        <FieldError id="offer-price-error" errors={offerErrors['offer.price']} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                      <div>
                        <label className="text-text-primary block text-xs font-semibold">
                          Campaign start date *
                        </label>
                        <input
                          value={state.duration.start}
                          aria-invalid={Boolean(offerErrors['duration.start'])}
                          aria-describedby={
                            offerErrors['duration.start'] ? 'campaign-start-error' : undefined
                          }
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              duration: { ...prev.duration, start: e.target.value },
                            }))
                          }
                          type="date"
                          className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        />
                        <FieldError
                          id="campaign-start-error"
                          errors={offerErrors['duration.start']}
                        />
                      </div>
                      <div>
                        <label className="text-text-primary block text-xs font-semibold">
                          Campaign end date *
                        </label>
                        <input
                          value={state.duration.end}
                          aria-invalid={Boolean(offerErrors['duration.end'])}
                          aria-describedby={
                            offerErrors['duration.end'] ? 'campaign-end-error' : undefined
                          }
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              duration: { ...prev.duration, end: e.target.value },
                            }))
                          }
                          type="date"
                          className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        />
                        <FieldError id="campaign-end-error" errors={offerErrors['duration.end']} />
                      </div>
                    </div>

                    <fieldset className="space-y-2 pt-2">
                      <legend className="text-text-primary block text-xs font-semibold">
                        Offer dates
                      </legend>
                      <p className="text-text-secondary text-xs">
                        The campaign dates above are when Mitra runs the campaign. They are not the
                        dates your offer is valid. Say so only if it is true.
                      </p>
                      {(
                        [
                          ['none', 'No specific offer dates'],
                          ['whole_campaign', 'The offer is valid for the whole campaign'],
                          ['custom', 'The offer has its own dates'],
                        ] as const
                      ).map(([mode, label]) => (
                        <label
                          key={mode}
                          className="text-text-primary flex items-center gap-2 text-xs"
                        >
                          <input
                            type="radio"
                            name="offer-validity-mode"
                            checked={(state.offer.validity?.mode ?? 'none') === mode}
                            onChange={() =>
                              setState((prev) => ({
                                ...prev,
                                offer: {
                                  ...prev.offer,
                                  validity: {
                                    start: prev.offer.validity?.start ?? '',
                                    end: prev.offer.validity?.end ?? '',
                                    mode,
                                  },
                                },
                              }))
                            }
                          />
                          {label}
                        </label>
                      ))}
                      {state.offer.validity?.mode === 'custom' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {(['start', 'end'] as const).map((edge) => (
                            <div key={edge}>
                              <label className="text-text-primary block text-xs font-semibold">
                                {edge === 'start' ? 'Offer start date *' : 'Offer end date *'}
                              </label>
                              <input
                                value={state.offer.validity?.[edge] ?? ''}
                                aria-invalid={Boolean(
                                  offerErrors[
                                    edge === 'start' ? 'offer.validityStart' : 'offer.validityEnd'
                                  ]
                                )}
                                aria-describedby={
                                  offerErrors[
                                    edge === 'start' ? 'offer.validityStart' : 'offer.validityEnd'
                                  ]
                                    ? `offer-validity-error-${edge}`
                                    : undefined
                                }
                                onChange={(e) =>
                                  setState((prev) => ({
                                    ...prev,
                                    offer: {
                                      ...prev.offer,
                                      validity: {
                                        mode: 'custom',
                                        start: prev.offer.validity?.start ?? '',
                                        end: prev.offer.validity?.end ?? '',
                                        [edge]: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                type="date"
                                className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                              />
                              <FieldError
                                id={`offer-validity-error-${edge}`}
                                errors={
                                  offerErrors[
                                    edge === 'start' ? 'offer.validityStart' : 'offer.validityEnd'
                                  ]
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </fieldset>
                  </div>
                )}

                {/* STEP 6: Audience */}
                {state.step === 6 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-text-primary block text-xs font-semibold tracking-wider uppercase">
                        Localities *
                      </label>
                      <p className="text-text-secondary mb-1 text-xs">
                        Comma-separated target areas (e.g., Kondapur, Gachibowli)
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
                        className="border-border-medium bg-surface text-text-primary placeholder:text-text-tertiary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-text-primary block text-xs font-semibold">
                          Min Age *
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
                          className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-text-primary block text-xs font-semibold">
                          Max Age *
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
                          className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 7: Call to Action */}
                {state.step === 7 && (
                  <fieldset>
                    <legend className="sr-only">Call to action</legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {availableCTAs.map((c) => {
                        const isSelected = state.cta === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setState((prev) => ({ ...prev, cta: c.value }))}
                            aria-pressed={isSelected}
                            className={optionCardClass(isSelected)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-text-primary text-xs font-semibold">{c.label}</p>
                              {isSelected && (
                                <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-text-secondary mt-1 text-xs">{c.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* STEP 8: Language & Regional Style */}
                {state.step === 8 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-text-primary mb-2 text-xs font-semibold tracking-wider uppercase">
                        Language
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {LANGUAGES.map((l) => {
                          const isSelected = state.primaryLanguage === l.value;
                          return (
                            <button
                              key={l.value}
                              type="button"
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  primaryLanguage: l.value,
                                  // Keep the style while it still fits; otherwise Neutral.
                                  regionalStyle:
                                    prev.regionalStyle &&
                                    regionalStylesFor({
                                      language: l.value,
                                      location: business?.location,
                                      stored: normalizeRegionalStyle(
                                        business?.businessBrain?.localization?.regionalStyle
                                      ),
                                    }).includes(prev.regionalStyle)
                                      ? prev.regionalStyle
                                      : 'neutral',
                                }))
                              }
                              aria-pressed={isSelected}
                              className={`flex items-center justify-between ${optionCardClass(isSelected)}`}
                            >
                              <span className="text-text-primary text-xs font-medium">
                                {l.label}
                              </span>
                              {isSelected && (
                                <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-text-primary mb-2 text-xs font-semibold tracking-wider uppercase">
                        Regional style
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {regionalStylesFor({
                          language: state.primaryLanguage ?? undefined,
                          location: business?.location,
                          stored: normalizeRegionalStyle(
                            business?.businessBrain?.localization?.regionalStyle
                          ),
                        })
                          .map((value) => REGIONAL_STYLES.find((r) => r.value === value))
                          .filter((r): r is NonNullable<typeof r> => Boolean(r))
                          .map((r) => {
                            const isSelected = state.regionalStyle === r.value;
                            return (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() =>
                                  setState((prev) => ({ ...prev, regionalStyle: r.value }))
                                }
                                aria-pressed={isSelected}
                                className={`flex items-center justify-between ${optionCardClass(isSelected)}`}
                              >
                                <span className="text-text-primary text-xs font-medium">
                                  {r.label}
                                </span>
                                {isSelected && (
                                  <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 9: Campaign Style */}
                {state.step === 9 && (
                  <fieldset>
                    <legend className="sr-only">Campaign style</legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {CAMPAIGN_STYLES.map((c) => {
                        const isSelected = state.campaignStyle === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() =>
                              setState((prev) => ({ ...prev, campaignStyle: c.value }))
                            }
                            aria-pressed={isSelected}
                            className={optionCardClass(isSelected)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-text-primary text-xs font-semibold">{c.label}</p>
                              {isSelected && (
                                <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-text-secondary mt-1 text-xs">{c.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* STEP 10: Review & Generate */}
                {state.step === 10 && business && (
                  <div className="space-y-4 text-xs">
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                      <h3 className="font-semibold text-amber-500">Ready to Generate Campaign</h3>
                      <p className="text-text-secondary mt-0.5">
                        Mitra will generate copy, posters, reel scripts, and targeted audience
                        strategy.
                      </p>
                    </div>

                    {/* Strategic Creative Concept Route Card */}
                    <div className="rounded-xl border border-amber-500/30 bg-slate-800/80 p-3.5 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <span className="font-semibold text-white">Strategic Creative Route</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsConceptModalOpen(true)}
                          className="border-amber-500/50 text-xs text-amber-300 hover:bg-amber-500/20"
                        >
                          {selectedConcept ? 'Change Concept Angle' : 'Select Creative Route'}
                        </Button>
                      </div>
                      {selectedConcept ? (
                        <div className="mt-2 text-xs">
                          <p className="font-bold text-amber-400">{selectedConcept.title}</p>
                          <p className="mt-0.5 text-slate-300 italic">"{selectedConcept.hook}"</p>
                          <p className="mt-1 text-slate-400">{selectedConcept.reasoning}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">
                          Mitra has 3 strategic creative routes prepared for your business. Click
                          "Select Creative Route" to review and customize.
                        </p>
                      )}
                    </div>

                    <div className="text-text-secondary grid grid-cols-2 gap-2">
                      <div className="bg-bg-secondary rounded-lg p-2.5">
                        <span className="text-text-primary block font-semibold">Business:</span>
                        {business.name} ({business.location.city})
                      </div>
                      <div className="bg-bg-secondary rounded-lg p-2.5">
                        <span className="text-text-primary block font-semibold">Offer:</span>
                        {state.offer.headline || 'Offer set'} (₹{state.offer.price})
                      </div>
                      <div className="bg-bg-secondary rounded-lg p-2.5">
                        <span className="text-text-primary block font-semibold">Target Area:</span>
                        {state.audience.localities.join(', ')}
                      </div>
                      <div className="bg-bg-secondary rounded-lg p-2.5">
                        <span className="text-text-primary block font-semibold">Dialect:</span>
                        {LANGUAGES.find((l) => l.value === state.primaryLanguage)?.label}
                      </div>
                    </div>

                    <div className="border-brand-200/60 bg-brand-50 rounded-xl border p-3 dark:bg-amber-950/20">
                      <p className="text-text-primary font-semibold">Credits Summary</p>
                      <p className="text-text-secondary">
                        Current: {creditsRemaining ?? '—'} credits | Cost:{' '}
                        {ESTIMATED_CAMPAIGN_GENERATION_CREDITS} credits
                      </p>
                      {creditsRemaining !== null &&
                        creditsRemaining < ESTIMATED_CAMPAIGN_GENERATION_CREDITS && (
                          <p className="text-error-600 mt-1.5 font-medium" role="alert">
                            You need {ESTIMATED_CAMPAIGN_GENERATION_CREDITS - creditsRemaining} more
                            credits to generate this campaign.{' '}
                            <Link href="/billing" className="underline">
                              Buy credits or upgrade
                            </Link>
                          </p>
                        )}
                    </div>

                    {submitError && <p className="text-error-600 font-medium">{submitError}</p>}
                  </div>
                )}

                {stepError && (
                  <p className="text-error-600 mt-3 text-xs font-semibold">{stepError}</p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Action Buttons */}
            <div className="border-border-light mt-6 flex gap-3 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={state.step === 1 || phase === 'submitting'}
                className="transition-transform duration-150 hover:-translate-y-[0.5px]"
              >
                Back
              </Button>

              {state.step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={validateAndNext}
                  className="flex-1 transition-transform duration-150 hover:-translate-y-[0.5px]"
                >
                  Continue
                </Button>
              ) : (
                <MagneticWrap className="flex-1" strength={5}>
                  <Button
                    type="button"
                    fullWidth
                    onClick={handleGenerate}
                    loading={phase === 'submitting'}
                    disabled={
                      phase === 'submitting' ||
                      (creditsRemaining !== null &&
                        creditsRemaining < ESTIMATED_CAMPAIGN_GENERATION_CREDITS)
                    }
                  >
                    {phase === 'submitting'
                      ? 'Starting generation...'
                      : 'Generate Campaign Strategy'}
                  </Button>
                </MagneticWrap>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUMN 2: Live AI Generation Flow & Business Context (3 cols) */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          {/* AI Workflow Checklist Card */}
          <div className="rounded-2xl border border-amber-500/20 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-amber-400 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              AI Studio Status
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-bold text-emerald-400">✓</span>
                <span>Business Brain Synced</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span
                  className={
                    state.selectedProductId || state.photos.length > 0
                      ? 'font-bold text-emerald-400'
                      : 'text-slate-600'
                  }
                >
                  {state.selectedProductId || state.photos.length > 0 ? '✓' : '○'}
                </span>
                <span>Product / Media Selected</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span
                  className={state.offer.headline ? 'font-bold text-emerald-400' : 'text-slate-600'}
                >
                  {state.offer.headline ? '✓' : '○'}
                </span>
                <span>Offer Structured</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span
                  className={
                    state.audience.localities.length > 0
                      ? 'font-bold text-emerald-400'
                      : 'text-slate-600'
                  }
                >
                  {state.audience.localities.length > 0 ? '✓' : '○'}
                </span>
                <span>Localities Locked ({state.audience.localities.length || 0})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span
                  className={
                    state.primaryLanguage ? 'font-bold text-emerald-400' : 'text-slate-600'
                  }
                >
                  {state.primaryLanguage ? '✓' : '○'}
                </span>
                <span>
                  Dialect: {LANGUAGES.find((l) => l.value === state.primaryLanguage)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Mascot Advice Card */}
          <div className="border-border-light bg-surface flex flex-col items-center rounded-2xl border p-4 text-center shadow-sm">
            <MascotScene
              pose={currentMascot.pose}
              size="md"
              message={currentMascot.text}
              align="center"
            />
          </div>

          {/* Business Brain Intelligence Callout */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
            <div className="font-semibold text-amber-400">💡 Business Intelligence</div>
            <p>
              <strong className="text-white">{business?.name || ''}</strong> ·{' '}
              {business?.location?.city || ''}
            </p>
            <p className="text-slate-400">
              Targeting ages {state.audience.ageMin}–{state.audience.ageMax} across local
              neighborhoods.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUMN 3: Live Visual Campaign Preview Canvas (4 cols)       */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                Live Campaign Preview
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                {state.type === 'reel' ? '9:16 Reel' : '1:1 Post'}
              </span>
            </div>

            {/* Campaign Visual Canvas */}
            <div className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl border border-slate-700/80 bg-gradient-to-br from-amber-600/30 via-slate-900 to-amber-900/40 p-4 shadow-inner">
              {/* Image / Graphic Background */}
              {currentPreviewPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPreviewPhoto}
                  alt="Preview"
                  className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900 to-black opacity-80" />
              )}

              {/* Offer Badge Top Left */}
              <div className="relative z-10 self-start">
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold tracking-wider text-slate-950 uppercase shadow-lg">
                  {previewDiscountLabel}
                </span>
              </div>

              {/* Offer Details Overlay Bottom */}
              <div className="relative z-10 space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/80 p-3 shadow-lg backdrop-blur-md">
                <h4 className="text-sm leading-tight font-extrabold text-white">
                  {state.offer.headline || 'Your offer headline'}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-amber-400">
                    {state.offer.price ? `₹${state.offer.price}` : '₹ —'}
                  </span>
                  {state.offer.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      ₹{state.offer.originalPrice}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-[11px]">
                  <span className="font-semibold text-amber-300">
                    {currentCTAObj?.label || 'Order on WhatsApp 💬'}
                  </span>
                  <span className="max-w-[120px] truncate text-slate-400">
                    {business?.name || ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Dialect / Language Badge */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>Dialect:</span>
              <span className="font-semibold text-slate-200">
                {LANGUAGES.find((l) => l.value === state.primaryLanguage)?.label} (
                {REGIONAL_STYLES.find((r) => r.value === state.regionalStyle)?.label})
              </span>
            </div>

            {/* Export Format Badges */}
            <div className="border-t border-slate-800 pt-2">
              <span className="mb-2 block text-[11px] font-semibold text-slate-400">
                Export Formats:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-300">
                  1:1 Feed Post
                </span>
                <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-300">
                  9:16 Story
                </span>
                <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-300">
                  WhatsApp Banner
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Concept Selector & Mixing Modal */}
      <ConceptSelectorModal
        isOpen={isConceptModalOpen}
        onClose={() => setIsConceptModalOpen(false)}
        businessId={business?.businessId || ''}
        onSelectConcept={(concept) => setSelectedConcept(concept)}
      />
    </div>
  );
}
