import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { imageModel } from '../../config/geminiModels';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import {
  createCampaignDoc,
  updateCampaignDoc,
  getBusinessDoc,
  getBrandKitDoc,
  getProductDoc,
  createCampaignAssets,
  getSavedStyleDoc,
  getCreativePreferencesByBusiness,
  getCampaignByIdempotencyKey,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError, customerSafeInternalMessage } from '../../utils/errors';
import { InsufficientCreditsError } from '../../utils/errors';
import type { Campaign, LocalizationProfile, CampaignAsset } from '../../types';
import { GenerationPipeline } from '../../services/ai/pipeline';
import { getBrandCreativeContext } from '../../services/ai/brandCreativeContext';
import {
  executeWithUsageControl,
  getGenerationCost,
  USAGE_ERROR_CODES,
} from '../../services/usageControl';
import {
  trackEvent,
  trackCreativeEvent,
  trackCampaignApproved,
  ANALYTICS_EVENTS,
} from '../../services/analyticsService';
import {
  computeSourceFingerprint,
  computeVerticalFactsFingerprint,
} from '../../services/ai/truthCheck';
import { assertVerticalImplemented, getVerticalConfig } from '../../config/verticals';
import { requireCampaignAllowance } from '../../services/entitlements';
import { ValidationError } from '../../utils/errors';
import { validateOffer, validateAgainstCatalog, firstMessage } from '../../utils/offerValidation';
import { toSavedStyleContext } from '../../services/savedStyle';
import { creativeTemplateRegistry } from '../../services/creativeTemplateRegistry';
import type { CampaignObjective, CreativeObjective } from '../../types';

// A reasonable default mapping from the business-facing campaign objective
// to the Creative Template system's objective vocabulary. Used only to pick
// a starting guess — resolveCreativeObjective below always defers to
// whatever the selected template actually supports.
const CAMPAIGN_TO_CREATIVE_OBJECTIVE: Record<CampaignObjective, CreativeObjective> = {
  weekend_offer: 'promotion',
  new_dish: 'launch',
  festival: 'promotion',
  discount: 'promotion',
  brand_awareness: 'awareness',
  service_promotion: 'promotion',
  package_promotion: 'promotion',
  appointment_promotion: 'conversion',
  new_service: 'launch',
  property_promotion: 'promotion',
  new_listing: 'launch',
  open_house: 'engagement',
  project_promotion: 'promotion',
  product_promotion: 'promotion',
  new_product: 'launch',
};

/**
 * Picks a `creativeObjective` that the selected template actually supports.
 * The client used to always send `'conversion'`, which
 * `buildCreativeTemplateContext` rejects outright for any template whose
 * `objectives` doesn't include it (festival, new-launch, and 7 others of
 * the 30 built-in templates) — failing generation before the pipeline even
 * starts. Without a template, there's nothing to validate against, so the
 * requested/mapped value passes through unchanged (pipeline.ts only calls
 * buildCreativeTemplateContext when both templateId and creativeObjective
 * are set).
 */
function resolveCreativeObjective(
  templateId: string | undefined,
  campaignObjective: CampaignObjective,
  requested: string | undefined
): CreativeObjective | undefined {
  const mapped = CAMPAIGN_TO_CREATIVE_OBJECTIVE[campaignObjective];
  if (!templateId) {
    return (requested as CreativeObjective | undefined) || mapped;
  }
  const template = creativeTemplateRegistry.getCreativeTemplate(templateId);
  if (!template) {
    // Unknown/invalid templateId — let the existing "Template not found"
    // error from buildCreativeTemplateContext surface as before.
    return (requested as CreativeObjective | undefined) || mapped;
  }
  if (requested && template.objectives.includes(requested as CreativeObjective)) {
    return requested as CreativeObjective;
  }
  if (template.objectives.includes(mapped)) {
    return mapped;
  }
  return template.objectives[0];
}

const generateCampaignStrategySchema = z.object({
  businessId: z.string().min(1),
  templateId: z.string().optional(),
  styleId: z.string().min(1).optional(),
  creativeObjective: z.string().optional(),
  // The union of every vertical's allowed objectives (see config/verticals.ts).
  // This schema can't yet know which business the request is for — that's
  // only known once `business` is fetched below — so it accepts the full
  // union here, then assertObjectiveAndCtaAllowedForVertical (below) checks
  // the submitted value against the specific business's own VerticalConfig.
  objective: z.enum([
    'weekend_offer',
    'new_dish',
    'festival',
    'discount',
    'brand_awareness',
    'service_promotion',
    'package_promotion',
    'appointment_promotion',
    'new_service',
    'property_promotion',
    'new_listing',
    'open_house',
    'project_promotion',
    'product_promotion',
    'new_product',
  ]),
  productId: z.string().optional(),
  newProduct: z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      images: z.array(z.string().url()).min(1).max(5),
    })
    .optional(),
  offer: z.object({
    headline: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    type: z.enum(['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty']),
    // The OFFER's own dates, optional: the campaign's duration below is when Mitra runs the campaign, not the
    // period in which the offer is valid. validitySource records how the dates came to be.
    validityStart: z.string().datetime().optional(),
    validityEnd: z.string().datetime().optional(),
    validitySource: z.enum(['owner_dates', 'whole_campaign']).optional(),
    terms: z.string().max(1000).optional(),
  }),
  duration: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  audience: z.object({
    localities: z.array(z.string()).min(1).max(10),
    ageRange: z.object({ min: z.number().min(18), max: z.number().max(80) }).optional(),
    occasion: z.enum(['weekend', 'festival', 'weekday_lunch', 'family']).optional(),
  }),
  // Same rationale as `objective` above — the union of every vertical's CTAs.
  cta: z.enum([
    'order_whatsapp',
    'book_table',
    'view_menu',
    'call_now',
    'get_directions',
    'book_appointment',
  ]),
  localization: z.object({
    country: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    locality: z.string().min(1),
    primaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
    secondaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
    languageMixing: z.enum(['minimal', 'natural', 'heavy']),
    regionalStyle: z.enum([
      'neutral',
      'hyderabadi',
      'telangana',
      'mumbai',
      'bangalore',
      'delhi',
      'chennai',
      'kolkata',
    ]),
    slangPreference: z.enum(['none', 'light', 'moderate', 'heavy']),
    audienceDescription: z.string().min(1),
    brandTone: z.enum([
      'professional',
      'friendly',
      'premium',
      'traditional',
      'modern',
      'luxury',
      'casual',
      'bold',
    ]),
    campaignStyle: z.enum([
      'funny',
      'quirky',
      'sarcastic',
      'dark_comedy',
      'emotional',
      'urgent',
      'fomo',
      'storytelling',
      'educational',
      'youthful',
    ]),
    contentFormat: z.enum(['poster', 'story', 'reel', 'caption', 'whatsapp']),
  }),
  idempotencyKey: z.string().uuid(),
});

export const generateCampaignStrategy = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 50,
    timeoutSeconds: 540,
    memory: '2GiB',
    // Phase 12 Secret Handling audit: binds this function's Cloud Run
    // instance to the named Google Secret Manager secret (set via
    // `firebase functions:secrets:set GEMINI_API_KEY`) so config/env.ts's
    // process.env.GEMINI_API_KEY read is actually backed by Secret Manager
    // in production, not a plain/manually-set Cloud Run env var.
    secrets: ['GEMINI_API_KEY'],
  },
  validatedCallable(generateCampaignStrategySchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('generateCampaignStrategy', {
      userId: context.userId,
      businessId: data.businessId,
    });

    const creditsRequired = getGenerationCost('campaign_generation');
    const userId = context.userId;
    // Declared outside the try block (not just inside it) so the catch
    // block below can still reach it to mark the campaign document
    // 'failed' on a pipeline exception — see Phase 12 fix there.
    const campaignId = uuidv7();

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(userId, 'generateCampaignStrategy');

      // M3 (Pass 2): a retry of a request that already completed (client
      // timeout-and-retry, a network-level resend of the exact same HTTP
      // request) must return the campaign that request already created —
      // not reserve credits and run the entire 13-stage pipeline again for
      // the exact same idempotencyKey. Checked before any credit
      // reservation so a genuine replay never touches usageControl at all.
      const existingCampaign = await getCampaignByIdempotencyKey(data.idempotencyKey);
      if (existingCampaign) {
        return { campaignId: existingCampaign.campaignId, campaign: existingCampaign };
      }

      // Phase 29: fetched here, before any credit reservation, so that an
      // unsupported vertical (assertVerticalImplemented below) — or a
      // missing business — is rejected before executeWithUsageControl ever
      // reserves credits, rather than reserving-then-refunding for a
      // generation that was always going to be refused.
      const business = await getBusinessDoc(data.businessId);
      if (!business) {
        throw new Error(`Business not found: ${data.businessId}`);
      }
      assertVerticalImplemented(business.category);

      // Phase 30: no vertical may submit another vertical's objective or
      // CTA (e.g. a salon business must never be able to generate a
      // "book_table" campaign) — the Zod schema above accepts the union of
      // every vertical's values since it can't know which business this is
      // for yet; this is the actual per-business enforcement, checked
      // against that business's own VerticalConfig.
      const verticalConfig = getVerticalConfig(business.category);
      if (!verticalConfig.allowedObjectives.includes(data.objective)) {
        throw new ValidationError(
          { objective: [`"${data.objective}" is not a valid objective for this business.`] },
          `Objective not valid for this business's vertical (${business.category}).`
        );
      }
      if (!verticalConfig.allowedCTAs.includes(data.cta)) {
        throw new ValidationError(
          { cta: [`"${data.cta}" is not a valid CTA for this business.`] },
          `CTA not valid for this business's vertical (${business.category}).`
        );
      }

      const savedStyle = data.styleId ? await getSavedStyleDoc(data.styleId) : null;
      if (
        data.styleId &&
        (!savedStyle || savedStyle.businessId !== data.businessId || !savedStyle.active)
      ) {
        throw new ValidationError(
          { styleId: ['The selected Saved Style is unavailable for this business.'] },
          'Saved Style is unavailable.'
        );
      }
      if (savedStyle && savedStyle.userId !== userId) {
        throw new ValidationError(
          { styleId: ['The selected Saved Style does not belong to this user.'] },
          'Saved Style ownership could not be verified.'
        );
      }

      // Pass 2C P1-B: a contradictory offer (a "was" price below the price now, a percentage offer with no real
      // discount, an end date before its start, an offer that is over before the campaign begins, a "was" price
      // that disagrees with the catalogue) is rejected HERE — before the quota check, before any credit
      // reservation and before any AI call — with a message the owner can act on. Truth Check would only catch
      // the downstream copy mismatch, after generation had already cost money.
      const offerErrors = validateOffer(
        {
          price: data.offer.price,
          originalPrice: data.offer.originalPrice,
          type: data.offer.type,
          validityStart: data.offer.validityStart,
          validityEnd: data.offer.validityEnd,
        },
        data.duration
      );
      if (data.productId && Object.keys(offerErrors).length === 0) {
        const catalogProduct = await getProductDoc(data.productId);
        if (catalogProduct && catalogProduct.businessId === data.businessId) {
          Object.assign(
            offerErrors,
            validateAgainstCatalog(
              {
                type: data.offer.type,
                originalPrice: data.offer.originalPrice,
                price: data.offer.price,
              },
              catalogProduct.price
            )
          );
        }
      }
      if (Object.keys(offerErrors).length > 0) {
        throw new ValidationError(offerErrors, firstMessage(offerErrors));
      }

      // P0-4 (docs/P0_HARDENING_TRACKER.md): plan-tier campaign quota,
      // checked BEFORE any credit reservation or AI provider call — a
      // Free/Starter user who has already used their monthly campaign
      // allowance is rejected here with zero credits consumed and zero AI
      // cost, not merely hidden by frontend UI (TC-PLAN-002/005).
      await requireCampaignAllowance(userId);

      const now = new Date().toISOString();
      const resolvedCreativeObjective = resolveCreativeObjective(
        data.templateId,
        data.objective,
        data.creativeObjective
      );

      // Execute generation with full usage control:
      // - Check eligibility
      // - Reserve credits atomically
      // - Run generation
      // - Finalize deduction on success
      // - Refund on failure
      const { result, creditsUsed } = await executeWithUsageControl(
        userId,
        data.idempotencyKey,
        'campaign_generation',
        async () => {
          // Fetch brand kit, and (if an existing product was selected
          // rather than an ad-hoc newProduct) the product itself, for pipeline
          // context. `business` was already fetched above (see the vertical
          // guard) and is reused here via closure rather than re-fetched.
          const [brandKit, existingProduct] = await Promise.all([
            getBrandKitDoc(data.businessId),
            data.productId ? getProductDoc(data.productId) : Promise.resolve(null),
          ]);

          if (data.productId && !existingProduct) {
            throw new Error(`Product not found: ${data.productId}`);
          }
          if (existingProduct && existingProduct.businessId !== data.businessId) {
            throw new Error('Product does not belong to this business');
          }

          // The pipeline's "newProduct" input field is generic product data for
          // generation, not specifically an ad-hoc/never-saved product — populate
          // it from the selected existing product when one was chosen, so product
          // name/description/price/images actually reach Business/Product
          // Understanding (stage 1-2) instead of an empty productName.
          const pipelineProduct = data.newProduct
            ? {
                name: data.newProduct.name,
                description: data.newProduct.description,
                price: data.newProduct.price,
                images: data.newProduct.images,
                category: 'main',
              }
            : existingProduct
              ? {
                  name: existingProduct.name,
                  description: existingProduct.description,
                  price: existingProduct.price,
                  images: existingProduct.images.map((img) => img.url),
                  category: existingProduct.category,
                }
              : undefined;

          // Create initial campaign document
          const campaign: Campaign = {
            campaignId,
            businessId: data.businessId,
            userId,
            objective: data.objective,
            templateId: data.templateId,
            creativeObjective: resolvedCreativeObjective,
            savedStyleId: savedStyle?.styleId,
            savedStyleVersion: savedStyle?.version,
            productId: data.productId,
            newProduct: data.newProduct
              ? {
                  name: data.newProduct.name,
                  description: data.newProduct.description,
                  price: data.newProduct.price,
                  images: data.newProduct.images,
                }
              : undefined,
            offer: data.offer,
            duration: data.duration,
            audience: data.audience,
            cta: data.cta,
            localization: data.localization as LocalizationProfile,
            status: 'validating',
            // Phase 12 fix: this ran inside the executeWithUsageControl
            // callback, executed BEFORE the outer `const { result,
            // creditsUsed } = await executeWithUsageControl(...)`
            // assignment (line ~136) completes — referencing that
            // `creditsUsed` here was a genuine ReferenceError
            // ("Cannot access 'creditsUsed' before initialization", a
            // closure over a not-yet-initialized const), which meant
            // EVERY generation, success or Truth-Check-failure alike,
            // crashed as soon as it reached this line — confirmed by a
            // real emulator test forcing the success path. creditsRequired
            // (computed up-front from getGenerationCost, already in scope
            // before the callback runs) is the correct, already-known
            // value for what this operation actually costs.
            creditsReserved: creditsRequired,
            metadata: {
              idempotencyKey: data.idempotencyKey,
              ...(savedStyle
                ? { savedStyleId: savedStyle.styleId, savedStyleVersion: savedStyle.version }
                : {}),
            },
            createdAt: now,
            updatedAt: now,
          };

          // Persist the initial campaign document, then move status to analyzing.
          // (generateCampaignStrategy is the sole entry point the client calls — it must
          // create its own campaign doc rather than assuming a prior createCampaign call,
          // since createCampaign's separate reservation would otherwise double-charge credits.)
          await createCampaignDoc(campaign);
          await updateCampaignDoc(campaignId, {
            status: 'analyzing',
            updatedAt: new Date().toISOString(),
          });

          // Track campaign_started - generation workflow actually began
          await trackEvent(ANALYTICS_EVENTS.CAMPAIGN_STARTED, userId, data.businessId, campaignId);

          const rawPreferences = await getCreativePreferencesByBusiness(data.businessId);
          const creativePreferences = {
            preferredTemplates: rawPreferences
              .filter((p) => p.preference === 'preferred')
              .map((p) => p.templateId),
            avoidedTemplates: rawPreferences
              .filter((p) => p.preference === 'avoided')
              .map((p) => p.templateId),
          };

          const { performanceRecommendationService } =
            await import('../../services/recommendation/performanceRecommendationService.js');
          const performanceRecommendations =
            await performanceRecommendationService.buildGenerationRecommendationContext(
              data.businessId
            );

          const pipeline = new GenerationPipeline();
          const result = await pipeline.execute({
            businessId: data.businessId,
            templateId: data.templateId,
            creativeObjective: resolvedCreativeObjective,
            campaignId,
            creativePreferences,
            performanceRecommendations,
            businessName: business.name,
            businessCategory: business.category,
            businessLocation: {
              city: business.location.city,
              state: business.location.state,
              locality: business.location.locality,
            },
            whatsappNumber: business.contact.whatsapp,
            productId: data.productId,
            productName: pipelineProduct?.name || '',
            offerHeadline: data.offer.headline,
            offerPrice: data.offer.price,
            // The owner's original price is what makes a discount a fact the copy can state and Truth
            // Check can verify; regenerateAsset already passed it, generation did not.
            offerOriginalPrice: data.offer.originalPrice,
            offerType: data.offer.type,
            offerDescription: data.offer.description,
            offerValidityStart: data.offer.validityStart,
            offerValidityEnd: data.offer.validityEnd,
            offerValiditySource: data.offer.validitySource,
            offerTerms: data.offer.terms,
            objective: data.objective,
            audience: data.audience,
            cta: data.cta,
            localizationProfile: data.localization,
            campaignStyle: data.localization.campaignStyle,
            brandProfile: getBrandCreativeContext(brandKit),
            businessBrain: business.businessBrain,
            duration: data.duration,
            newProduct: pipelineProduct,
            vertical: business.category,
            savedStyleContext: savedStyle ? toSavedStyleContext(savedStyle) : undefined,
          });

          // Update status to generating_creatives
          await updateCampaignDoc(campaignId, {
            status: 'generating_creatives',
            updatedAt: new Date().toISOString(),
          });

          // Update status to validating_output
          await updateCampaignDoc(campaignId, {
            status: 'validating_output',
            updatedAt: new Date().toISOString(),
          });

          // P0-1 (Truth Check gating): the verdict must be known BEFORE any
          // asset is persisted or its Storage object kept around — this used
          // to run in the opposite order, so every generated asset (poster/
          // story image files + Firestore CampaignAsset docs with imageUrl)
          // was already saved and fetchable by the time a FAIL verdict was
          // even computed below. See docs/P0_HARDENING_TRACKER.md P0-1.
          const campaignPack = result.campaignPack;
          const truthCheckStatus = campaignPack?.truthCheck?.status || 'REVIEW_REQUIRED';
          const truthCheckResult = campaignPack?.truthCheck ?? undefined;
          const finalStatus =
            truthCheckStatus === 'PASS'
              ? 'verified'
              : truthCheckStatus === 'FAIL'
                ? 'failed'
                : 'generated';

          if (finalStatus === 'failed') {
            // DISCARD: no CampaignAsset doc is ever created for a rejected
            // campaign (no imageUrl/content can leak via Firestore), and the
            // Storage objects the pipeline already uploaded are deleted so a
            // client that captured a token URL mid-generation can't fetch it
            // afterward either (see deleteGeneratedAssets's doc comment —
            // those URLs bypass storage.rules entirely, so deletion is the
            // only real revocation).
            const { deleteGeneratedAssets } =
              await import('../../services/ai/generatedAssetStorage.js');
            await deleteGeneratedAssets(result.allGeneratedStoragePaths || []);
          } else if (campaignPack && campaignPack.assets) {
            // PERSIST: only reached for PASS / REVIEW_REQUIRED verdicts.
            const assetsToSave: CampaignAsset[] = campaignPack.assets.map((asset: any) => ({
              assetId: asset.assetId,
              campaignId,
              businessId: data.businessId,
              type: asset.type as any,
              index: asset.index,
              content: asset.content,
              imageUrl: asset.imageUrl,
              // F2: durable reference, now actually populated by the
              // pipeline (previously this field existed on the type but was
              // never set — undefined here silently dropped it).
              storagePath: asset.storagePath,
              status: asset.status,
              promptUsed: asset.content?.prompt,
              modelUsed: imageModel(),
              createdAt: asset.createdAt,
            }));
            await createCampaignAssets(assetsToSave);
          }

          // Fingerprint the exact source facts Truth Check compared against,
          // so a later change to business contact/location or product price
          // can be detected as making this verification stale (see
          // isVerificationStale in truthCheck.ts / Phase 6 Truth Check report).
          const sourceFingerprint = computeSourceFingerprint({
            businessPhone: business.contact.phone,
            businessWhatsApp: business.contact.whatsapp,
            businessLocationText: `${business.location.locality || ''} ${business.location.city} ${business.location.state}`,
            productPrice: pipelineProduct?.price,
          });

          // Phase 33: a second, independent fingerprint covering the facts
          // Business Brain editing can now change after generation — see
          // computeVerticalFactsFingerprint's doc comment for why this is
          // separate from sourceFingerprint above.
          const verticalFingerprint = computeVerticalFactsFingerprint({
            deliveryRadiusKm: business.businessBrain?.businessRules?.deliveryRadiusKm,
            minimumOrder: business.businessBrain?.businessRules?.minimumOrder,
            verticalProfileSnapshot: business.businessBrain?.verticalProfile
              ? JSON.stringify(business.businessBrain.verticalProfile)
              : undefined,
          });

          // Phase 12: Truth Check FAIL is a normal (non-exceptional)
          // terminal outcome of a generation that otherwise completed —
          // it does not throw, so executeWithUsageControl finalizes
          // (charges) the reservation rather than refunding it, exactly
          // as an equivalent regenerateAsset Truth-Check failure does
          // (Phase 6/10: consistent, intentional behavior — AI compute was
          // genuinely spent on the attempt). Populating `error` here lets
          // the frontend show an accurate message distinguishing this
          // charged-but-failed outcome from a refunded pipeline-exception
          // failure (see the outer catch block below), instead of
          // guessing or asserting a credits claim it can't verify.
          const truthCheckFailureError =
            truthCheckStatus === 'FAIL'
              ? {
                  code: 'TRUTH_CHECK_FAILED',
                  message:
                    campaignPack?.truthCheck?.summary ||
                    'Some details in this campaign could not be verified against your business information.',
                  stage: 'validating_output',
                  retryable: true,
                }
              : undefined;

          await updateCampaignDoc(campaignId, {
            status: finalStatus,
            // Same fix as creditsReserved above — creditsRequired is the
            // correct, already-in-scope value; the outer `creditsUsed`
            // isn't assigned until after this callback returns.
            // A discarded (Truth Check FAIL) campaign delivers nothing, so nothing is charged.
            creditsUsed: finalStatus === 'failed' ? 0 : creditsRequired,
            ...(truthCheckFailureError ? { error: truthCheckFailureError } : {}),
            metadata: {
              idempotencyKey: data.idempotencyKey,
              generationTimeMs: Date.now() - new Date(startTime).getTime(),
              truthCheckStatus,
              truthCheckSummary: campaignPack?.truthCheck?.summary,
              truthCheckResult: truthCheckResult
                ? {
                    status: truthCheckResult.status,
                    checkedAt: truthCheckResult.checkedAt,
                    checks: truthCheckResult.checks,
                    summary: truthCheckResult.summary,
                    sourceFingerprint,
                    verticalFingerprint,
                  }
                : undefined,
            },
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });

          // The campaign was discarded: throw so executeWithUsageControl REFUNDS the reservation. The
          // customer receives no copy, image or reel, so keeping their credits (the old behaviour) charged
          // them for nothing. The failed state and its reason were persisted just above; the catch
          // block below re-writes the same code/message rather than a raw error.
          if (finalStatus === 'failed') {
            throw Object.assign(
              new Error(
                truthCheckFailureError?.message ??
                  'Some details in this campaign could not be verified against your business information.'
              ),
              { code: 'TRUTH_CHECK_FAILED' }
            );
          }

          // Track campaign_generated - campaign successfully persisted
          await trackEvent(
            ANALYTICS_EVENTS.CAMPAIGN_GENERATED,
            userId,
            data.businessId,
            campaignId
          );

          if (finalStatus === 'verified') {
            await trackCampaignApproved(userId, data.businessId, campaignId);
          }

          if (campaignPack?.assets?.length > 0) {
            const asset = campaignPack.assets[0];
            await trackCreativeEvent({
              eventType: 'creative_generated',
              userId,
              businessId: data.businessId,
              creativeId: asset.id,
              campaignId,
              templateId: data.templateId,
              templateVersion: 1, // Assume v1 if not explicitly versioned yet
              creativeType: 'post',
              objective: data.objective,
            });
          }

          return result;
        },
        { businessId: data.businessId }
      );

      logFunctionComplete(logger, startTime, {
        success: true,
        campaignId,
        status: 'generated',
        creditsUsed,
      });
      return { campaignId, campaign: result };
    } catch (error: any) {
      if (error.code === USAGE_ERROR_CODES.INSUFFICIENT_CREDITS) {
        throw new InsufficientCreditsError(creditsRequired, /* available */ 0).toHttpsError();
      }
      if (error.code === USAGE_ERROR_CODES.SUBSCRIPTION_REQUIRED) {
        throw new Error('Subscription required for this operation');
      }
      logFunctionError(logger, startTime, error as Error);

      // Phase 12: when the pipeline throws (provider error, timeout,
      // malformed output, etc.), executeWithUsageControl already refunds
      // the reservation before re-throwing — but nothing here previously
      // moved the campaign document itself to a terminal state. The
      // document was already created (createCampaignDoc, inside the
      // generation callback) and left sitting at whatever intermediate
      // status it last reached ('analyzing'/'generating_copy'/etc.),
      // which is NOT one of GenerationProgress.tsx's TERMINAL_STATUSES —
      // the frontend's poll loop would continue forever, showing the user
      // an indefinite "processing" spinner for a campaign the backend
      // already knows failed. If reserveCreditsForOperation itself threw
      // (e.g. insufficient credits, checked above and handled separately)
      // the campaign document was never created, so this update is
      // best-effort and its own failure must never mask the real error.
      try {
        await updateCampaignDoc(campaignId, {
          status: 'failed',
          error: {
            code: error.code || 'GENERATION_FAILED',
            // Customer-safe: raw provider/schema text must not be stored on a document the client reads.
            message:
              error instanceof Error && error.message
                ? (error as { code?: string }).code === 'TRUTH_CHECK_FAILED'
                  ? error.message
                  : customerSafeInternalMessage(error.message)
                : 'Campaign generation failed.',
            stage: 'generation',
            retryable: true,
          },
          updatedAt: new Date().toISOString(),
        });
      } catch (statusUpdateError) {
        logFunctionError(logger, startTime, statusUpdateError as Error, {
          note: 'Failed to persist failed status after generation error (campaign doc may not exist yet)',
        });
      }

      throw mapErrorToHttpsError(error);
    }
  })
);
