import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
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
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { InsufficientCreditsError } from '../../utils/errors';
import type { Campaign, LocalizationProfile, CampaignAsset } from '../../types';
import { GenerationPipeline } from '../../services/ai/pipeline';
import {
  executeWithUsageControl,
  getGenerationCost,
  USAGE_ERROR_CODES,
} from '../../services/usageControl';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import {
  computeSourceFingerprint,
  computeVerticalFactsFingerprint,
} from '../../services/ai/truthCheck';
import { assertVerticalImplemented, getVerticalConfig } from '../../config/verticals';
import { ValidationError } from '../../utils/errors';

const generateCampaignStrategySchema = z.object({
  businessId: z.string().min(1),
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
    validityStart: z.string().datetime(),
    validityEnd: z.string().datetime(),
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
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
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

      const now = new Date().toISOString();

      // Execute generation with full usage control:
      // - Check eligibility
      // - Reserve credits atomically
      // - Run generation
      // - Finalize deduction on success
      // - Refund on failure
      const { result, creditsUsed } = await executeWithUsageControl(
        userId,
        campaignId,
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

          const pipeline = new GenerationPipeline();
          const result = await pipeline.execute({
            businessId: data.businessId,
            campaignId,
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
            offerType: data.offer.type,
            offerDescription: data.offer.description,
            offerValidityStart: data.offer.validityStart,
            offerValidityEnd: data.offer.validityEnd,
            offerTerms: data.offer.terms,
            objective: data.objective,
            audience: data.audience,
            cta: data.cta,
            localizationProfile: data.localization,
            campaignStyle: data.localization.campaignStyle,
            brandProfile: brandKit || {},
            businessBrain: business.businessBrain,
            duration: data.duration,
            newProduct: pipelineProduct,
            vertical: business.category,
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

          // Save campaign assets to Firestore
          const campaignPack = result.campaignPack;
          if (campaignPack && campaignPack.assets) {
            const assetsToSave: CampaignAsset[] = campaignPack.assets.map((asset: any) => ({
              assetId: asset.assetId,
              campaignId,
              businessId: data.businessId,
              type: asset.type as any,
              index: asset.index,
              content: asset.content,
              imageUrl: asset.imageUrl,
              status: asset.status,
              promptUsed: asset.content?.prompt,
              modelUsed: 'dall-e-3',
              createdAt: asset.createdAt,
            }));
            await createCampaignAssets(assetsToSave);
          }

          // Update campaign with final results
          const truthCheckStatus = campaignPack?.truthCheck?.status || 'REVIEW_REQUIRED';
          const truthCheckResult = campaignPack?.truthCheck ?? undefined;
          const finalStatus =
            truthCheckStatus === 'PASS'
              ? 'verified'
              : truthCheckStatus === 'FAIL'
                ? 'failed'
                : 'generated';

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
            creditsUsed: creditsRequired,
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

          // Track campaign_generated - campaign successfully persisted
          await trackEvent(
            ANALYTICS_EVENTS.CAMPAIGN_GENERATED,
            userId,
            data.businessId,
            campaignId
          );

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
            message:
              error instanceof Error && error.message
                ? error.message
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
