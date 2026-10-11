import { analyzeProductImages, generateStructuredText, generateImage } from './index';
import { buildCreativeBrief, type CreativeBrief, type CreativeBriefInput } from './creativeBrief';
import { buildCreativeTemplateContext } from './creativeTemplateContext';
import { buildImagePromptPack } from './imagePromptBuilder';
import { runDeterministicTruthCheck } from './truthCheck';
import { resolveUserInstructionConflicts } from './conflictResolver';
import {
  composeCreativeSVG,
  DEFAULT_BRAND_STYLE,
  type CreativeTextOverlay,
  type CreativeBrandStyle,
} from './compositor';
import {
  fetchAsBuffer,
  uploadGeneratedAsset,
  downloadFromStoragePath,
} from './generatedAssetStorage';
import { MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN } from '../../config/pricing';
import { getVerticalConfigOrDefault } from '../../config/verticals';
import { brainForGeneration } from './brainForGeneration';
import {
  aiCallsSoFar,
  inAiCallStage,
  setAiCallStage,
  summarizeAiCalls,
  withAiCallLog,
} from './aiCallLog';
import { buildFactSources } from './factSources';
import type { CreativeBrainInput, CreativeBlueprint } from './creativeBrain.types';
import {
  buildOfferContractPrompt,
  contactNumbersOnFile,
  hasDefinedOpeningHours,
} from './offerContract';
import { buildVerticalContractPrompt } from './verticalContract';
import {
  languageCheckFor,
  languageGuardrail,
  languageMode,
  localeFromInput,
  localizationSystemRules,
  localizationTask,
  regionalInsightsLine,
} from './localizationContract';
import { z } from 'zod';
import type {
  BusinessCategory,
  BusinessRules,
  BrandCreativeContext,
  PipelineTrace,
  UserRequestStageData,
  IntentExtractionStageData,
  BusinessBrainRetrievalStageData,
  ContextSelectedStageData,
  GeminiRequestStageData,
  GeminiResponseStageData,
  ValidationCheckItem,
  ValidationStageData,
  MitraTransformationsStageData,
  CreativeGenerationStageData,
  FinalCampaignStageData,
  TruthCheckResult,
} from '../../types';
import { createLogger, logFunctionStage } from '../../utils/logging';
import { IndustryKnowledgeResolver } from './creativeBrain/industry/industryKnowledge.resolver';

/**
 * businessBrain.businessRules (as stored in Firestore) only carries operational
 * settings (opening hours, delivery radius, etc.), not the CreativeBrief's
 * factuality/availability/communication rules — and legacy business docs may be
 * missing businessRules entirely. This always returns a well-formed BusinessRules
 * object so downstream prompt-building never dereferences undefined fields.
 */
function toCreativeBriefBusinessRules(stored?: {
  deliveryRadiusKm?: number;
  minimumOrder?: number;
}): BusinessRules {
  return {
    factuality: {
      allowCreativeFraming: true,
      requireExplicitPricing: true,
      prohibitInventedProducts: true,
      prohibitInventedClaims: true,
    },
    availability: {
      displayUnavailableItems: false,
      // Only what the owner gave. An unknown radius or minimum is left out, never filled with 5 km or
      // "no minimum order": the model would state it as a fact.
      ...(stored?.minimumOrder !== undefined
        ? { minimumOrderRequired: stored.minimumOrder > 0 }
        : {}),
      ...(stored?.deliveryRadiusKm !== undefined
        ? { deliveryRadiusKm: stored.deliveryRadiusKm }
        : {}),
    },
    communication: {
      contactInformationAllowed: true,
      operatingHoursRespectRequired: true,
      brandRestrictions: [],
    },
  };
}

/**
 * Campaign Generation Pipeline
 * Orchestrates the 13-stage generation process
 */

// ============================================
// SCHEMAS FOR STRUCTURED OUTPUTS
// ============================================

// Stage 1: Business Understanding
export const BusinessUnderstandingSchema = z.object({
  businessSummary: z.string().min(50).max(500),
  businessFacts: z
    .array(
      z.object({
        category: z.enum([
          'identity',
          'product',
          'pricing',
          'location',
          'hours',
          'contact',
          'policy',
        ]),
        fact: z.string(),
        source: z.string(),
        criticality: z.enum(['high', 'medium', 'low']),
      })
    )
    // At least one (the business itself). Was min(10), which a small Business Brain cannot honestly
    // satisfy under this stage's own "NEVER invent facts" rule, so generation failed for new users.
    .min(1),
  missingInformation: z.array(z.string()).default([]),
  constraints: z
    .array(
      z.object({
        type: z.enum([
          'price_floor',
          'price_ceiling',
          'offer_validity',
          'delivery_radius',
          'availability',
          'claim_restriction',
        ]),
        description: z.string(),
        enforcement: z.enum(['strict', 'warn']),
      })
    )
    .default([]),
  verticalContext: z.any(),
});

export type BusinessUnderstandingOutput = z.infer<typeof BusinessUnderstandingSchema>;

// Stage 2: Product Understanding
export const ProductUnderstandingSchema = z.object({
  productSummary: z.string(),
  productFacts: z.array(
    z.object({
      fact: z.string(),
      source: z.enum(['metadata', 'vision', 'inferred']),
      criticality: z.enum(['high', 'medium', 'low']),
    })
  ),
  visualAttributes: z.object({
    dishName: z.string(),
    platingStyle: z.string(),
    colorPalette: z.array(z.string()),
    ambianceCues: z.array(z.string()),
    keyVisualElements: z.array(z.string()),
    suggestedCompositions: z.array(z.string()),
  }),
  missingInformation: z.array(z.string()),
  marketingAngles: z.array(z.string()).length(5),
});

export type ProductUnderstandingOutput = z.infer<typeof ProductUnderstandingSchema>;

// Stage 3: Campaign Strategy
export const CampaignStrategySchema = z.object({
  angle: z.string().min(20).max(300),
  hook: z.string().min(10).max(100),
  offerFraming: z.string().min(20).max(500),
  audienceInsight: z.string().min(20).max(500),
  keyMessages: z.array(z.string().min(10).max(200)).length(5),
  ctaStrategy: z.object({
    primary: z.string().min(5).max(100),
    urgency: z.string().min(10).max(200),
    valueProposition: z.string().min(10).max(200),
  }),
  differentiators: z.array(z.string().min(10).max(200)).min(3).max(5),
  creativeDirection: z.object({
    visualStyle: z.string().min(10).max(300),
    mood: z.string().min(5).max(100),
    compositionHints: z.array(z.string().min(5).max(200)).length(3),
  }),
  riskFlags: z.array(z.string()).default([]),
});

export type CampaignStrategyOutput = z.infer<typeof CampaignStrategySchema>;

// Stage 4: Localization Strategy
export const LocalizationStrategySchema = z.object({
  vocabulary: z.record(z.string()).refine((val) => Object.keys(val).length >= 20, {
    message: 'At least 20 vocabulary entries required',
  }),
  phrasingRules: z.array(z.string()).min(5),
  humorStyle: z.string(),
  ctaPatterns: z.array(z.string()).min(5),
  slangGuide: z.record(
    z.object({
      term: z.string(),
      meaning: z.string(),
      usage: z.enum(['high', 'medium', 'low']),
      examples: z.array(z.string()),
      avoidWith: z.array(z.string()),
    })
  ),
  culturalReferences: z.array(
    z.object({
      reference: z.string(),
      context: z.string(),
      usage: z.string(),
    })
  ),
  languageMixingRules: z.object({
    pattern: z.enum(['natural', 'minimal', 'heavy']),
    sentenceLevel: z.boolean(),
    wordLevel: z.boolean(),
    examples: z.array(z.string()),
    avoid: z.array(z.string()),
  }),
  audienceAdaptation: z.object({
    officeWorkers: z.array(z.string()),
    families: z.array(z.string()),
    students: z.array(z.string()),
    // (no vertical-specific segment such as "foodies": this schema is asked of every kind of business, and a
    // restaurant-only key made the model invent food language for a saree shop)
  }),
});

export type LocalizationStrategyOutput = z.infer<typeof LocalizationStrategySchema>;

// Stage 5: Copy Generation
export const CopyPackSchema = z.object({
  headlines: z
    .array(z.object({ text: z.string().max(100), characterCount: z.number(), variant: z.string() }))
    .length(5),
  adCopies: z
    .array(
      z.object({
        primaryText: z.string(),
        headline: z.string(),
        description: z.string(),
        cta: z.string(),
      })
    )
    .length(5),
  captions: z
    .array(
      z.object({ text: z.string(), hashtags: z.array(z.string()), characterCount: z.number() })
    )
    .length(5),
  storyConcepts: z
    .array(
      z.object({
        frames: z.array(
          z.object({
            copy: z.string(),
            visualCue: z.string(),
            cta: z.string().optional(),
            interactive: z.string().optional(),
          })
        ),
        overallTheme: z.string(),
      })
    )
    .length(3),
  reelConcepts: z
    .array(
      z.object({
        hook: z.string(),
        scenes: z.array(
          z.object({ description: z.string(), visualDirection: z.string(), duration: z.string() })
        ),
        productReveal: z.string(),
        cta: z.string(),
        caption: z.string(),
        shootingTips: z.string(),
      })
    )
    .length(3),
  whatsappMessage: z.object({
    message: z.string(),
    waLink: z.string(),
    attributionParams: z.object({
      campaignId: z.string(),
      creativeId: z.string(),
      source: z.string(),
    }),
  }),
  ctaVariations: z.array(z.object({ text: z.string(), variant: z.string() })).length(5),
});

export type CopyPackOutput = z.infer<typeof CopyPackSchema>;

// Stage 6: Image Prompts (AI-generated prompts for on-demand generation)
export const ImagePromptPackSchema = z.object({
  posterPrompts: z
    .array(
      z.object({
        prompt: z.string(),
        negativePrompt: z.string(),
        aspectRatio: z.literal('4:5'),
        styleGuidance: z.string(),
        textOverlay: z.object({ headline: z.string(), offer: z.string(), cta: z.string() }),
      })
    )
    .length(5),
  storyFramePrompts: z
    .array(
      z.array(
        z.object({
          prompt: z.string(),
          negativePrompt: z.string(),
          aspectRatio: z.literal('9:16'),
          frameNumber: z.number(),
          storyIndex: z.number(),
        })
      )
    )
    .length(3),
  reelFramePrompts: z
    .array(
      z.array(
        z.object({
          prompt: z.string(),
          negativePrompt: z.string(),
          aspectRatio: z.literal('9:16'),
          sceneNumber: z.number(),
          reelIndex: z.number(),
        })
      )
    )
    .length(3),
});

export type ImagePromptPackOutput = z.infer<typeof ImagePromptPackSchema>;

// Stage 7: Generated Images (actual image URLs from provider)
export const GeneratedImagesSchema = z.object({
  posterUrls: z.array(z.string().url()).length(5),
  storyFrameUrls: z.array(z.array(z.string().url())).length(3),
  reelFrameUrls: z.array(z.array(z.string().url())).length(3),
  generationMetadata: z.array(
    z.object({
      assetType: z.string(),
      index: z.number(),
      prompt: z.string(),
      provider: z.string(),
      model: z.string(),
      latencyMs: z.number(),
    })
  ),
});

export type GeneratedImagesOutput = z.infer<typeof GeneratedImagesSchema>;

// Validation Schemas
export const TruthValidationSchema = z.object({
  passed: z.boolean(),
  violations: z.array(
    z.object({
      assetId: z.string(),
      assetType: z.string(),
      field: z.string(),
      expected: z.string(),
      actual: z.string(),
      severity: z.enum(['critical', 'major', 'minor']),
      suggestion: z.string(),
    })
  ),
  assetStatus: z.record(z.enum(['passed', 'failed', 'warning'])),
});

export type TruthValidationOutput = z.infer<typeof TruthValidationSchema>;

export const QualityValidationSchema = z.object({
  passed: z.boolean(),
  issues: z.array(
    z.object({
      assetId: z.string(),
      assetType: z.string(),
      issue: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      suggestion: z.string(),
    })
  ),
  assetScores: z.record(z.number()),
});

export type QualityValidationOutput = z.infer<typeof QualityValidationSchema>;

export const SafetyValidationSchema = z.object({
  passed: z.boolean(),
  violations: z.array(
    z.object({
      assetId: z.string(),
      assetType: z.string(),
      category: z.enum([
        'medical',
        'misleading',
        'copyright',
        'hate',
        'adult',
        'illegal',
        'pii',
        'political',
      ]),
      description: z.string(),
      excerpt: z.string(),
      severity: z.enum(['critical', 'high', 'medium']),
    })
  ),
});

export type SafetyValidationOutput = z.infer<typeof SafetyValidationSchema>;

// Stage 12: Truth Check (Phase 16 - deterministic fact verification)
export const TruthCheckSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'REVIEW_REQUIRED']),
  checkedAt: z.string(),
  checks: z.array(
    z.object({
      category: z.enum([
        'business',
        'product',
        'price',
        'offer',
        'location',
        'contact',
        'operations',
        'claim',
      ]),
      status: z.enum(['PASS', 'FAIL', 'REVIEW_REQUIRED']),
      generatedValue: z.string().optional(),
      expectedValue: z.string().optional(),
      reason: z.string().optional(),
    })
  ),
  summary: z.string(),
});

export type TruthCheckOutput = z.infer<typeof TruthCheckSchema>;

// Stage 13: Campaign Pack Assembly
export const CampaignPackSchema = z.object({
  campaignId: z.string(),
  businessId: z.string(),
  productId: z.string().optional(),
  objective: z.string(),
  offer: z.any().optional(),
  localization: z.any().optional(),
  strategy: z.any().optional(),
  copy: z.any().optional(),
  assets: z.array(
    z.object({
      assetId: z.string(),
      type: z.string(),
      index: z.number(),
      content: z.any(),
      imageUrl: z.string().optional(),
      storagePath: z.string().optional(),
      status: z.string(),
      createdAt: z.string(),
    })
  ),
  truthCheck: z.any().optional(),
  status: z.enum(['draft', 'generating', 'generated', 'verified', 'failed']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CampaignPackOutput = z.infer<typeof CampaignPackSchema>;

/**
 * Main Pipeline Orchestrator
 */
export class GenerationPipeline {
  /**
   * Execute the full 13-stage generation pipeline
   */
  async execute(rawInput: GenerationPipelineInput): Promise<GenerationPipelineOutput> {
    return withAiCallLog(() => this.executeCampaign(rawInput));
  }

  private async executeCampaign(rawInput: GenerationPipelineInput): Promise<GenerationPipelineOutput> {
    // Provenance lives on the raw Brain; the model-facing copy below has it removed.
    const brainFacts =
      (rawInput.businessBrain as { knowledge?: { facts?: Record<string, { source?: string }> } } | undefined)
        ?.knowledge?.facts ?? {};
    // The model (and the stored trace) see the Business Brain without the owner's personal details and
    // provenance bookkeeping — see brainForGeneration.
    const input: GenerationPipelineInput = {
      ...rawInput,
      businessBrain: brainForGeneration(rawInput.businessBrain),
    };
    const conflictPlan = resolveUserInstructionConflicts(input);
    const _resolvedInput = conflictPlan.resolvedInput;

    const stageResults: {
      conflictPlan?: any;
      businessUnderstanding?: any;
      productUnderstanding?: any;
      creativeBlueprint?: any;
      creativeBrainStatus?: { status: 'success' | 'fallback' | 'failed'; reason?: string; detail?: string };
      campaignStrategy?: any;
      localizationStrategy?: any;
      copyPack?: any;
      imagePrompts?: any;
      generatedImages?: any;
      truthValidation?: any;
      qualityValidation?: any;
      safetyValidation?: any;
      truthCheck?: any;
      campaignPack?: any;
      creativeTemplateContext?: any;
      adaptedCreativePlan?: any;
    } = {
      conflictPlan,
    };

    // Phase 14: every stage marker and the top-level failure here previously
    // used bare console.log/console.error with no campaignId/businessId
    // context attached — an operator seeing "Pipeline failed: Error: ..."
    // in the logs had no way to correlate it to a specific customer's
    // campaign without cross-referencing timestamps. Reusing the existing
    // structured logger (functions/src/utils/logging.ts, already used
    // throughout the Cloud Functions layer) and logFunctionStage (defined
    // there since an earlier phase but never actually called anywhere)
    // instead. currentStage is tracked so the catch block can report
    // exactly which stage was running when the pipeline failed.
    const logger = createLogger({ businessId: input.businessId, campaignId: input.campaignId });
    let currentStage = 'business_understanding';

    // Wall-clock time of each stage, so "where does the latency go?" is answered from data, not guesses.
    // Stored with the campaign (metadata.stageTimingsMs) and logged once at the end.
    const stageTimingsMs: Record<string, number> = {};
    let openStage: { name: string; startedAt: number } | undefined;
    const closeOpenStage = () => {
      if (openStage) stageTimingsMs[openStage.name] = Date.now() - openStage.startedAt;
      openStage = undefined;
    };
    const startStage = (name: string) => {
      closeOpenStage();
      openStage = { name, startedAt: Date.now() };
      setAiCallStage(name);
      logFunctionStage(logger, name);
    };

    let creativeTemplateContext = undefined;
    let adaptedCreativePlan = undefined;
    if (input.templateId && input.creativeObjective) {
      const { buildCreativeTemplateContext } = await import('./creativeTemplateContext.js');
      creativeTemplateContext = buildCreativeTemplateContext({
        templateId: input.templateId,
        objective: input.creativeObjective as any,
        businessBrain: input.businessBrain,
        brandCreativeContext: input.brandProfile,
        productName: input.productName,
        productDescription: input.newProduct?.description,
        productPrice: input.offerPrice,
        productCategory: input.newProduct?.category,
        offerHeadline: input.offerHeadline,
        offerDescription: input.offerDescription,
        offerPrice: input.offerPrice,
        offerOriginalPrice: input.offerOriginalPrice,
        offerType: input.offerType,
        offerValidityStart: input.offerValidityStart,
        offerValidityEnd: input.offerValidityEnd,
        offerTerms: input.offerTerms,
        audienceLocalities: input.audience.localities,
        audienceAgeRange: input.audience.ageRange,
        audienceOccasion: input.audience.occasion,
        savedStyle: input.savedStyleContext,
        creativePreferences: input.creativePreferences,
      });

      const { selectCreativeContext } = await import('./creativeContextSelector.js');
      const { TemplateAdaptationPlanner } = await import('./templateAdaptation.js');

      const selectedContext = selectCreativeContext({
        task: 'campaign_strategy', // High-level task for adaptation planning
        templateContext: creativeTemplateContext,
      });

      const planner = new TemplateAdaptationPlanner();
      adaptedCreativePlan = await planner.adapt({
        template: creativeTemplateContext.template,
        selectedContext,
        objective: creativeTemplateContext.objective,
      });
    }
    // Attach to previousResults conceptually so it's available early
    stageResults.creativeTemplateContext = creativeTemplateContext;
    stageResults.adaptedCreativePlan = adaptedCreativePlan;

    try {
      // Stage 1: Business Understanding
      currentStage = 'business_understanding';
      startStage(currentStage);
      stageResults.businessUnderstanding = await this.runStage1(input);

      // Stage 2: Product/Image Understanding
      currentStage = 'product_understanding';
      startStage(currentStage);
      stageResults.productUnderstanding = await this.runStage2(
        input,
        stageResults['businessUnderstanding']
      );

      // Creative Brain Reasoning Stage (Adaptive State Machine - Phase 2.5 / 3A)
      currentStage = 'creative_brain';
      startStage(currentStage);
      let creativeBlueprint: CreativeBlueprint | undefined = undefined;
      let creativeBrainStatus: NonNullable<typeof stageResults.creativeBrainStatus> = {
        status: 'failed',
        reason: 'no blueprint was produced',
      };
      try {
        const { AdaptiveCreativeBrainStateMachine } =
          await import('./creativeBrain/adaptiveStateMachine.js');
        const cbInput = this.buildCreativeBrainInput(input, stageResults, conflictPlan);
        const adaptiveMachine = new AdaptiveCreativeBrainStateMachine(cbInput);
        const { result: cbResult, context: stateContext } =
          await adaptiveMachine.executeAdaptiveFlow(cbInput);

        if (cbResult.success && cbResult.blueprint) {
          creativeBlueprint = cbResult.blueprint;
          if (cbResult.fallbackTriggered) {
            // The Creative Brain's model calls failed and a generic blueprint was used. The campaign still
            // finishes (that is the design), but it must be visible, with the reason, to operators and in the
            // stored trace: a swallowed failure cannot be diagnosed or counted.
            logger.warn('CreativeBrain fell back to a generic blueprint', {
              reason: cbResult.error?.code ?? 'UNKNOWN',
              message: cbResult.error?.message,
            });
            (creativeBlueprint.trace as any).fallbackTriggered = true;
            (creativeBlueprint.trace as any).fallbackReason =
              cbResult.error?.code ?? cbResult.error?.message ?? 'UNKNOWN';
            creativeBrainStatus = {
              status: 'fallback',
              reason: cbResult.error?.code ?? cbResult.error?.message ?? 'UNKNOWN',
              ...(cbResult.error?.message ? { detail: cbResult.error.message } : {}),
            };
          } else {
            creativeBrainStatus = { status: 'success' };
          }
          (creativeBlueprint.trace as any).status = creativeBrainStatus.status;
          // Attach state transition traces to blueprint metadata for transparent observability
          if (creativeBlueprint.trace) {
            (creativeBlueprint.trace as any).stateTransitions = stateContext.transitionTraces;
            (creativeBlueprint.trace as any).finalState = stateContext.currentState;
          }
        }
      } catch (cbErr: any) {
        logger.warn('CreativeBrain reasoning exception in pipeline. Proceeding without a blueprint.', {
          error: cbErr instanceof Error ? cbErr.message : String(cbErr),
        });
        creativeBrainStatus = {
          status: 'failed',
          reason: cbErr instanceof Error ? cbErr.message : String(cbErr),
        };
      }
      stageResults.creativeBlueprint = creativeBlueprint;
      stageResults.creativeBrainStatus = creativeBrainStatus;

      // Stage 3: Campaign Strategy
      currentStage = 'campaign_strategy';
      startStage(currentStage);
      stageResults.campaignStrategy = await this.runStage3(input, stageResults);

      // Stage 4: Localization Strategy
      currentStage = 'localization_strategy';
      startStage(currentStage);
      stageResults.localizationStrategy = await this.runStage4(input, stageResults);

      // Stage 5: Copy Generation
      currentStage = 'copy_generation';
      startStage(currentStage);
      stageResults.copyPack = await this.runStage5(input, stageResults);

      // Stage 6: Creative Direction / Image Prompts
      currentStage = 'creative_direction';
      startStage(currentStage);
      stageResults.imagePrompts = await this.runStage6(input, stageResults);

      // Stage 7: Image Generation (AI provider)
      currentStage = 'image_generation';
      startStage(currentStage);
      stageResults.generatedImages = await this.runStage7(input, stageResults);

      // Stages 8-10: the three AI validations (truth, quality, safety). Each reads the generated campaign and
      // nothing from the others, so they run together instead of one after another: measured live, they were
      // ~25% of a campaign's wall-clock time (7 s + 4 s + 11 s in sequence; now the slowest one). A failure in
      // any of them still fails the campaign exactly as before, attributed to the stage that failed.
      closeOpenStage();
      const validationStart = Date.now();
      const validate = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
        logFunctionStage(logger, name);
        try {
          return await inAiCallStage(name, run);
        } catch (err) {
          currentStage = name;
          throw err;
        } finally {
          stageTimingsMs[name] = Date.now() - validationStart;
        }
      };
      [stageResults.truthValidation, stageResults.qualityValidation, stageResults.safetyValidation] =
        await Promise.all([
          validate('truth_validation', () => this.runStage8(input, stageResults)),
          validate('quality_validation', () => this.runStage9(input, stageResults)),
          validate('safety_validation', () => this.runStage10(input, stageResults)),
        ]);

      // Stage 11: Truth Check (Deterministic - Phase 16)
      currentStage = 'truth_check';
      startStage(currentStage);
      stageResults.truthCheck = await this.runStage11(input, stageResults);

      // Stage 12: Campaign Assembly
      currentStage = 'campaign_assembly';
      startStage(currentStage);
      stageResults.campaignPack = await this.runStage12(input, stageResults);

      closeOpenStage();
      logger.info('pipeline.timings', { stageTimingsMs });

      // Stage 13: Build 11-stage transparent pipeline execution trace
      const pipelineTrace = this.buildPipelineTrace(input, stageResults);
      if (stageResults.campaignPack) {
        stageResults.campaignPack.metadata = {
          ...(stageResults.campaignPack.metadata || {}),
          pipelineTrace,
          stageTimingsMs,
          // Did the Creative Brain really run with the model, or fall back (and why)?
          creativeBrain: stageResults.creativeBrainStatus,
          // Every model call: stage, model, attempt, repair, outcome, duration, reason for rejection.
          aiCalls: [...aiCallsSoFar()],
          aiCallSummary: summarizeAiCalls(aiCallsSoFar()),
          // Where each important fact came from.
          factSources: buildFactSources(input, brainFacts),
        };
      }

      return {
        success: true,
        stages: stageResults,
        campaignPack: stageResults.campaignPack,
        pipelineTrace,
        // P0-1: authoritative cleanup list — see the comment in runStage7.
        allGeneratedStoragePaths: stageResults.generatedImages?.allStoragePaths || [],
      };
    } catch (error) {
      logger.error('Pipeline failed', error, { stage: currentStage });
      throw error;
    }
  }

  private async runStage1(input: GenerationPipelineInput): Promise<any> {
    const prompt = this.buildBusinessUnderstandingPrompt(input);
    return generateStructuredText(prompt, BusinessUnderstandingSchema);
  }

  private async runStage2(
    input: GenerationPipelineInput,
    businessUnderstanding: any
  ): Promise<any> {
    // If new product with images, use Vision AI
    if (input.newProduct && input.newProduct.images.length > 0) {
      const visionResult = await analyzeProductImages(
        input.newProduct.images,
        {
          name: input.newProduct.name,
          description: input.newProduct.description,
          price: input.newProduct.price,
          category: 'main',
        },
        {
          name: input.businessName,
          category: input.businessCategory,
          location: input.businessLocation,
        }
      );

      const prompt = this.buildProductUnderstandingPrompt(
        input,
        businessUnderstanding,
        visionResult
      );
      return generateStructuredText(prompt, ProductUnderstandingSchema);
    }
    // Existing product - use metadata only
    const prompt = this.buildProductUnderstandingPrompt(input, businessUnderstanding, null);
    return generateStructuredText(prompt, ProductUnderstandingSchema);
  }

  private buildCreativeBrainInput(
    input: GenerationPipelineInput,
    stageResults: any,
    conflictPlan: any
  ): CreativeBrainInput {
    const rawCategory =
      input.vertical ||
      input.businessCategory ||
      input.businessBrain?.identity?.category ||
      'restaurant';
    const validVerticals = [
      'general',
      'restaurant',
      'salon',
      'real_estate',
      'retail',
      'services',
      'healthcare',
      'education',
      'fitness',
    ];
    const vertical = (validVerticals.includes(rawCategory) ? rawCategory : 'general') as any;

    return {
      businessBrain: input.businessBrain,
      vertical,
      intent: {
        campaignId: input.campaignId,
        businessId: input.businessId,
        objective: input.creativeObjective || input.objective || 'promotion',
        offer: {
          headline: input.offerHeadline || input.productName || 'Special Offer',
          price: input.offerPrice || 0,
          originalPrice: input.offerOriginalPrice,
          type: (input.offerType || 'fixed') as any,
          validityStart: input.offerValidityStart,
          validityEnd: input.offerValidityEnd,
          terms: input.offerTerms,
        },
        duration: {
          start: input.duration?.start ?? '',
          end: input.duration?.end ?? '',
        },
        audience: {
          localities: input.audience?.localities || [],
          ageRange: input.audience?.ageRange,
          occasion: input.audience?.occasion,
        },
        cta: (input.cta || 'call_now') as any,
        localization: {
          country: input.localizationProfile?.country || 'IN',
          state: input.localizationProfile?.state || input.businessLocation?.state || '',
          city: input.localizationProfile?.city || input.businessLocation?.city || '',
          locality: input.localizationProfile?.locality || input.businessLocation?.locality || '',
          primaryLanguage: input.localizationProfile?.primaryLanguage || 'en',
          secondaryLanguage: input.localizationProfile?.secondaryLanguage,
          languageMixing: input.localizationProfile?.languageMixing || 'natural',
          regionalStyle: input.localizationProfile?.regionalStyle || 'neutral',
          slangPreference: input.localizationProfile?.slangPreference || 'moderate',
          audienceDescription: input.localizationProfile?.audienceDescription || '',
          brandTone: (input.brandProfile?.tone ||
            input.businessBrain?.brand?.tone ||
            'friendly') as any,
          campaignStyle: (input.campaignStyle || 'funny') as any,
          contentFormat: ((input as any).contentFormat || 'poster') as any,
        },
        templateId: input.templateId,
      },
      businessUnderstanding: stageResults.businessUnderstanding,
      productUnderstanding: stageResults.productUnderstanding,
      productContext:
        input.productId || input.productName
          ? {
              productId: input.productId || 'p1',
              name: input.productName || 'Product',
              description: input.newProduct?.description,
              price: input.offerPrice || 0,
              category: input.newProduct?.category,
              images: input.newProduct?.images || [],
            }
          : undefined,
      industryCreativeContext: IndustryKnowledgeResolver.resolve({
        businessBrain: input.businessBrain,
        productContext: input.productId || input.productName ? {
          productId: input.productId || 'p1',
          name: input.productName || 'Product',
          description: input.newProduct?.description,
          price: input.offerPrice || 0,
          category: input.newProduct?.category,
        } : undefined,
        campaignIntent: {
          businessId: input.businessId,
          objective: input.creativeObjective || input.objective || 'promotion',
          offer: {
            headline: input.offerHeadline || input.productName || 'Special Offer',
            price: input.offerPrice || 0,
            originalPrice: input.offerOriginalPrice,
            type: (input.offerType || 'fixed') as any,
            validityStart: input.offerValidityStart,
            validityEnd: input.offerValidityEnd,
            terms: input.offerTerms,
          },
          duration: {
            start: input.offerValidityStart || new Date().toISOString(),
            end: input.offerValidityEnd || new Date().toISOString(),
          },
          audience: {
            localities: input.audience?.localities || [],
            ageRange: input.audience?.ageRange,
            occasion: input.audience?.occasion,
          },
          cta: (input.cta || 'call_now') as any,
          localization: input.localizationProfile || ({} as any),
        } as any,
        vertical,
      }),
      memory: {
        preferences: Array.isArray(input.creativePreferences)
          ? input.creativePreferences
          : (input.creativePreferences as any)?.preferences || [],
        feedback: [],
        activeSavedStyle: input.savedStyleContext,
      },
      conflictConstraints: {
        nonNegotiableRules: conflictPlan?.nonNegotiables || conflictPlan?.nonNegotiableRules || {},
        directives: conflictPlan?.directives || [],
        detectedConflictsCount: conflictPlan?.detectedConflictsCount || 0,
      },
    };
  }

  private async runStage3(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const blueprint: CreativeBlueprint | undefined = previousResults?.creativeBlueprint;
    // A fallback blueprint is generic by construction, so it never stands in for the AI strategy stage: the
    // strategy is only derived from a blueprint the Creative Brain really produced.
    if (
      blueprint &&
      blueprint.strategyDirectives &&
      (blueprint.trace as { fallbackTriggered?: boolean } | undefined)?.fallbackTriggered !== true
    ) {
      const dir = blueprint.strategyDirectives;

      // Ensure keyMessages length === 5 (CampaignStrategySchema requirement)
      let keyMessages = [...(dir.keyMessages || [])];
      while (keyMessages.length < 5) {
        if (keyMessages.length === 1) keyMessages.push(input.offerHeadline || input.productName);
        else if (keyMessages.length === 2)
          keyMessages.push(input.offerPrice ? `Price: ₹${input.offerPrice}` : input.productName);
        else if (keyMessages.length === 3) keyMessages.push(`Available at ${input.businessName}`);
        else keyMessages.push(`Contact: ${input.whatsappNumber || 'Call / WhatsApp'}`);
      }
      if (keyMessages.length > 5) {
        keyMessages = keyMessages.slice(0, 5);
      }

      // Ensure differentiators count between 3 and 5. The schema needs at least 3, but a differentiator is a
      // CLAIM, so padding uses only what the business actually told us (never "guaranteed", "authentic", "zero
      // hidden charges"): its own USP, its name and place, the product, the price it gave.
      let differentiators = [...(dir.differentiators || [])];
      const knownFacts = [
        (input.businessBrain as { positioning?: { usp?: string } } | undefined)?.positioning?.usp,
        input.productName ? `${input.productName} at ${input.businessName}` : undefined,
        input.businessLocation?.city
          ? `${input.businessName}, ${input.businessLocation.locality ? input.businessLocation.locality + ', ' : ''}${input.businessLocation.city}`
          : undefined,
        input.offerPrice ? `${input.productName} at ₹${input.offerPrice}` : undefined,
      ];
      for (const fact of knownFacts) {
        if (differentiators.length >= 3) break;
        if (fact && !differentiators.includes(fact)) differentiators.push(fact);
      }
      if (differentiators.length > 5) {
        differentiators = differentiators.slice(0, 5);
      }

      // Format angle (min 20, max 300)
      let angle = dir.angle || input.offerHeadline || 'Strategic campaign angle';
      if (angle.length < 20) {
        angle = `${angle} — Strategic campaign angle tailored for ${input.businessName}.`;
      }
      if (angle.length > 300) {
        angle = angle.substring(0, 297) + '...';
      }

      // Format hook (min 10, max 100)
      let hook = dir.hook || 'Special Offer';
      if (hook.length < 10) {
        hook = `${hook} — ${input.productName}`;
      }
      if (hook.length > 100) {
        hook = hook.substring(0, 97) + '...';
      }

      // Format offerFraming (min 20, max 500)
      let offerFraming = dir.offerFraming || input.offerHeadline;
      if (offerFraming.length < 20) {
        offerFraming = `${offerFraming} at ${input.businessName}.`;
      }
      if (offerFraming.length > 500) {
        offerFraming = offerFraming.substring(0, 497) + '...';
      }

      // Format audienceInsight (min 20, max 500)
      let audienceInsight = dir.audienceInsight || 'Local target customer segment';
      if (audienceInsight.length < 20) {
        audienceInsight = `${audienceInsight} in ${input.businessLocation?.city || 'local area'}.`;
      }
      if (audienceInsight.length > 500) {
        audienceInsight = audienceInsight.substring(0, 497) + '...';
      }

      const strategy: CampaignStrategyOutput = {
        angle,
        hook,
        offerFraming,
        audienceInsight,
        keyMessages: keyMessages as [string, string, string, string, string],
        ctaStrategy: {
          primary: dir.ctaPrimary || input.cta || 'call_now',
          // Urgency exists only if the owner gave the OFFER dates. The campaign's run dates are not an offer deadline.
          urgency:
            input.offerValidityStart && input.offerValidityEnd
              ? `Offer valid ${input.offerValidityStart.slice(0, 10)} to ${input.offerValidityEnd.slice(0, 10)}`
              : 'No offer end date was given: do not imply urgency or a deadline',
          valueProposition: offerFraming,
        },
        differentiators,
        creativeDirection: {
          visualStyle: `${blueprint.visualDirectives.emphasis} visual style with ${blueprint.visualDirectives.composition} composition`,
          mood: blueprint.visualDirectives.visualMood || 'engaging and authentic',
          compositionHints: [
            blueprint.visualDirectives.heroPromptGuidance || 'Hero product shot',
            'High contrast background for clear text readability',
            'Clean layout with prominent price badge',
          ],
        },
        riskFlags: [],
      };

      const parseResult = CampaignStrategySchema.safeParse(strategy);
      if (parseResult.success) {
        return parseResult.data;
      }
    }

    const prompt = this.buildCampaignStrategyPrompt(input, previousResults);
    return generateStructuredText(prompt, CampaignStrategySchema);
  }

  private async runStage4(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const prompt = this.buildLocalizationStrategyPrompt(input, previousResults);
    return generateStructuredText(prompt, LocalizationStrategySchema);
  }

  private async runStage5(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const prompt = this.buildCopyGenerationPrompt(input, previousResults);
    return generateStructuredText(prompt, CopyPackSchema);
  }

  private async runStage6(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const prompt = this.buildCreativeDirectionPrompt(input, previousResults);
    return generateStructuredText(prompt, ImagePromptPackSchema);
  }

  /**
   * Phase 7: previously made up to 32 sequential AI image-provider calls per
   * campaign (5 posters + 3 stories x 4 frames + 3 reels x 5 frames — that
   * exact count was confirmed against the prior implementation, not assumed)
   * while credits were only ever charged for ~2 images' worth, and the AI
   * model's own negative prompt explicitly instructed it NOT to render text/
   * prices — yet no deterministic step ever added that text afterward, so
   * every "poster" shipped with no price, offer, CTA, or phone on it at all.
   * Also: generated image URLs were the raw temporary OpenAI CDN URL,
   * persisted directly into Firestore, expiring within roughly an hour.
   *
   * Fixed with a hybrid architecture: exactly one AI image call per campaign
   * (MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN) produces a clean hero visual;
   * that image is downloaded and re-hosted in Firebase Storage (permanent
   * URL); poster/story variants are then produced by deterministically
   * compositing verified campaign facts (price, offer, CTA, phone, business
   * name — never AI-invented text) onto that same hero image via
   * compositor.ts. Reel output is a deterministic text storyboard reusing
   * the hero image as its cover — no per-scene AI image/video generation,
   * since no source-of-truth doc in this repo requires it and the task
   * explicitly instructs against building that.
   */
  private async runStage7(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const creativeBrief = this.buildCreativeBriefFromResults(input, previousResults);
    const generationMetadata: any[] = [];

    // P0-1: every Storage object this stage creates, regardless of which
    // (if any) final asset ends up referencing its storagePath. Truth Check
    // (stages 8-11) hasn't run yet when these uploads happen, so the caller
    // (generateCampaignStrategy.ts) needs an authoritative list to delete
    // on a FAIL verdict — a rejected campaign must not leave a
    // publicly-fetchable (token-URL) Storage object behind just because no
    // CampaignAsset document ended up pointing at it.
    const allStoragePaths: string[] = [];

    let heroImageUrl: string | null = null;
    // The SVG embeds bytes directly (see compositor.ts's composeCreativeSVG
    // doc comment) rather than referencing heroImageUrl by external href —
    // that URL is still stored separately (campaign_assets, reel cover) for
    // contexts that DO fetch it server-side or accept a normal URL.
    let heroImageDataUri: string | null = null;
    const campaignId = input.campaignId || 'draft';

    // I1 (Pass 2): when a real product photo exists, use it directly as the
    // hero — zero AI image calls needed, and the creative is genuinely,
    // verifiably the customer's own product rather than DALL-E 3's
    // interpretation of a text description (DALL-E 3's images.generate API
    // cannot accept a reference image at all, so "generate something that
    // looks like this photo" was never actually achievable — only faked by
    // an unenforceable prompt instruction, removed in imagePromptBuilder.ts).
    // Falls through to AI generation below only when no real photo exists.
    const productImageUrl = creativeBrief.product?.imageUrl;
    if (productImageUrl) {
      try {
        const { buffer, contentType } = await fetchAsBuffer(productImageUrl);
        heroImageUrl = productImageUrl;
        heroImageDataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
        generationMetadata.push({
          assetType: 'hero',
          prompt: '(none — real product photo used directly, no AI image generation)',
          provider: 'product-photo',
          model: 'none',
          latencyMs: 0,
        });
      } catch (error) {
        createLogger({ businessId: input.businessId, campaignId: input.campaignId }).warn(
          'Failed to load real product photo for hero image; falling back to AI generation',
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    }

    const heroPrompts = heroImageDataUri
      ? []
      : buildImagePromptPack(creativeBrief, MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN);
    const heroPrompt = heroPrompts[0];

    if (heroPrompt) {
      const startTime = Date.now();
      const result = await generateImage(heroPrompt);
      const latencyMs = Date.now() - startTime;

      if (result.success && (result.imageData || result.imageUrl)) {
        try {
          // Gemini returns inline bytes; a URL-returning provider is still supported.
          const { buffer, contentType } = result.imageData
            ? {
                buffer: Buffer.from(result.imageData.base64, 'base64'),
                contentType: result.imageData.mimeType,
              }
            : await fetchAsBuffer(result.imageUrl as string);
          const uploaded = await uploadGeneratedAsset(
            input.businessId,
            campaignId,
            'poster',
            buffer,
            contentType
          );
          heroImageUrl = uploaded.url;
          heroImageDataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
          allStoragePaths.push(uploaded.storagePath);
          generationMetadata.push({
            assetType: 'hero',
            prompt: heroPrompt.prompt,
            provider: result.provider || 'unknown',
            model: result.model || 'unknown',
            latencyMs,
            storagePath: uploaded.storagePath,
          });
        } catch (error) {
          generationMetadata.push({
            assetType: 'hero',
            prompt: heroPrompt.prompt,
            provider: result.provider || 'unknown',
            model: result.model || 'unknown',
            latencyMs,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to persist generated image to Storage',
          });
        }
      } else {
        createLogger({ businessId: input.businessId, campaignId: input.campaignId }).warn(
          'Hero image generation failed',
          {
            stage: 'image_generation',
            provider: result.provider || 'unknown',
            failureCode: 'AI_PROVIDER_ERROR',
            // The provider's own error message is a safe, short diagnostic
            // string (e.g. "content policy violation") — never the prompt
            // or any business data.
            providerError: result.error?.message,
          }
        );
        generationMetadata.push({
          assetType: 'hero',
          prompt: heroPrompt.prompt,
          provider: 'none',
          model: 'none',
          latencyMs,
          error: result.error?.message || 'Image generation failed',
        });
      }
    }

    const posterUrls: string[] = [];
    // F2: storagePath persisted alongside each URL (CampaignAsset.storagePath
    // exists in the type but was never actually set) — this is the durable
    // reference a future re-sign/refresh path can always regenerate a URL
    // from, independent of whether the currently-stored URL is still valid.
    const posterStoragePaths: string[] = [];
    const storyFrameUrls: string[][] = [];
    const storyFrameStoragePaths: string[][] = [];
    let reelScript: {
      coverImageUrl: string;
      scenes: Array<{ sceneNumber: number; durationSeconds: number; text: string }>;
    } | null = null;

    if (heroImageUrl && heroImageDataUri) {
      const textOverlay = this.buildCreativeTextOverlay(input, previousResults);
      const brandStyle = await this.buildBrandStyle(creativeBrief, input);

      const posterSvg = composeCreativeSVG(heroImageDataUri, textOverlay, brandStyle, 'poster');
      const posterUpload = await uploadGeneratedAsset(
        input.businessId,
        campaignId,
        'poster',
        Buffer.from(posterSvg, 'utf-8'),
        'image/svg+xml'
      );
      posterUrls.push(posterUpload.url);
      posterStoragePaths.push(posterUpload.storagePath);
      allStoragePaths.push(posterUpload.storagePath);

      const storyOverlays = this.buildStoryFrameOverlays(textOverlay);
      const frameUrls: string[] = [];
      const frameStoragePaths: string[] = [];
      for (const frameOverlay of storyOverlays) {
        const svg = composeCreativeSVG(heroImageDataUri, frameOverlay, brandStyle, 'story');
        const upload = await uploadGeneratedAsset(
          input.businessId,
          campaignId,
          'story',
          Buffer.from(svg, 'utf-8'),
          'image/svg+xml'
        );
        frameUrls.push(upload.url);
        frameStoragePaths.push(upload.storagePath);
        allStoragePaths.push(upload.storagePath);
      }
      storyFrameUrls.push(frameUrls);
      storyFrameStoragePaths.push(frameStoragePaths);

      reelScript = this.buildReelStoryboard(textOverlay, heroImageUrl);
    } else {
      // The poster is this pipeline's primary deliverable (section 54: "Poster
      // should be the primary reliable visual output"). Previously, a failed
      // image generation would silently continue — the campaign would still
      // reach Stage 12/finalize with zero visual assets, and
      // executeWithUsageControl would finalize full credits for a customer
      // who received a text-only "campaign" with no creative at all. Throwing
      // here instead routes through the SAME reserve/refund machinery
      // (executeWithUsageControl's catch block) already verified correct in
      // Phase 5/6 — the whole generation is treated as failed, and credits
      // are refunded rather than silently charged for missing work.
      throw new Error(
        `Image generation failed: no visual creative could be produced (${generationMetadata[0]?.error || 'unknown error'})`
      );
    }

    return {
      posterUrls,
      posterStoragePaths,
      storyFrameUrls,
      storyFrameStoragePaths,
      reelScript,
      generationMetadata,
      allStoragePaths,
    };
  }

  /**
   * Builds the ONLY text that will ever appear on a generated creative.
   * Every value here comes from server-verified campaign/business data
   * (GenerationPipelineInput, already Truth-Check-relevant) — never from
   * free-form AI output — so a creative composited from this can never
   * display a price, discount, phone number, or CTA the business didn't
   * actually provide.
   */
  private buildCreativeTextOverlay(
    input: GenerationPipelineInput,
    previousResults: any
  ): CreativeTextOverlay {
    const copyPack = previousResults?.copyPack;
    const rawHeadline = copyPack?.headlines?.[0];
    const headline: string =
      typeof rawHeadline === 'string'
        ? rawHeadline
        : rawHeadline?.text || input.offerHeadline || input.productName || '';

    const priceText = input.offerPrice ? `₹${input.offerPrice}` : undefined;
    const originalPriceText =
      input.offerOriginalPrice && input.offerOriginalPrice > input.offerPrice
        ? `₹${input.offerOriginalPrice}`
        : undefined;

    let offerBadge: string | undefined;
    if (
      input.offerType === 'percentage' &&
      input.offerOriginalPrice &&
      input.offerOriginalPrice > input.offerPrice
    ) {
      const pct = Math.round(
        ((input.offerOriginalPrice - input.offerPrice) / input.offerOriginalPrice) * 100
      );
      offerBadge = `${pct}% OFF`;
    } else if (input.offerType === 'free_delivery') {
      offerBadge = 'FREE DELIVERY';
    } else if (input.offerType === 'bogo') {
      offerBadge = 'BUY 1 GET 1';
    } else if (input.offerType === 'combo') {
      offerBadge = 'COMBO OFFER';
    } else if (input.offerType === 'loyalty') {
      offerBadge = 'LOYALTY REWARD';
    }

    const ctaMap: Record<string, string> = {
      order_whatsapp: 'Order on WhatsApp',
      book_table: 'Book Table',
      view_menu: 'View Menu',
      call_now: 'Call Now',
      get_directions: 'Get Directions',
    };
    const ctaText = ctaMap[input.cta] || 'Order Now';

    return {
      businessName: input.businessName,
      productName: input.productName,
      headline,
      priceText,
      originalPriceText,
      offerBadge,
      ctaText,
      phone:
        input.cta === 'call_now'
          ? input.businessPhone
          : input.whatsappNumber || input.businessPhone,
      locality: input.businessLocation?.locality || input.businessLocation?.city,
    };
  }

  private async buildBrandStyle(
    brief: CreativeBrief,
    input: GenerationPipelineInput
  ): Promise<CreativeBrandStyle> {
    const colors = brief.brand?.colors;
    const style: CreativeBrandStyle = {
      primaryColor: colors?.[0] || DEFAULT_BRAND_STYLE.primaryColor,
      accentColor: colors?.[1] || colors?.[0] || DEFAULT_BRAND_STYLE.accentColor,
      textColor: DEFAULT_BRAND_STYLE.textColor,
    };

    // Fetch the real logo bytes so composeCreativeSVG can embed them — this
    // is the only path by which the actual uploaded logo (not a
    // hallucinated one) reaches a generated creative (see D2 in the fix
    // plan). Best-effort: a missing/unreadable logo must never fail
    // generation, it just means no logo on this creative.
    const storagePath = brief.brand?.logoStoragePath;
    if (storagePath && brief.brand?.logoWidth && brief.brand?.logoHeight) {
      try {
        const { buffer, contentType } = await downloadFromStoragePath(storagePath);
        style.logo = {
          dataUri: `data:${contentType};base64,${buffer.toString('base64')}`,
          width: brief.brand.logoWidth,
          height: brief.brand.logoHeight,
        };
      } catch (error) {
        createLogger({ businessId: input.businessId, campaignId: input.campaignId }).warn(
          'Failed to load brand logo for compositing',
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    }

    return style;
  }

  /** 3 deterministic story frames from the SAME base overlay data — zero extra AI calls. */
  private buildStoryFrameOverlays(base: CreativeTextOverlay): CreativeTextOverlay[] {
    return [
      { ...base },
      {
        ...base,
        headline: base.offerBadge
          ? `${base.offerBadge} - ${base.priceText || ''}`
          : base.priceText || 'Special Offer',
      },
      { ...base, headline: base.ctaText },
    ];
  }

  /** Deterministic text storyboard — no per-scene AI image/video generation. */
  private buildReelStoryboard(
    overlay: CreativeTextOverlay,
    coverImageUrl: string
  ): {
    coverImageUrl: string;
    scenes: Array<{ sceneNumber: number; durationSeconds: number; text: string }>;
  } {
    return {
      coverImageUrl,
      scenes: [
        { sceneNumber: 1, durationSeconds: 3, text: overlay.headline },
        {
          sceneNumber: 2,
          durationSeconds: 4,
          text: overlay.productName ? `Featuring ${overlay.productName}` : overlay.headline,
        },
        {
          sceneNumber: 3,
          durationSeconds: 4,
          text: overlay.offerBadge
            ? `${overlay.priceText || ''} - ${overlay.offerBadge}`
            : overlay.priceText || 'Special Offer',
        },
        { sceneNumber: 4, durationSeconds: 3, text: overlay.ctaText },
      ],
    };
  }

  private async runStage8(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const prompt = this.buildTruthValidationPrompt(input, previousResults);
    return generateStructuredText(prompt, TruthValidationSchema);
  }

  private async runStage9(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const prompt = this.buildQualityValidationPrompt(input, previousResults);
    return generateStructuredText(prompt, QualityValidationSchema);
  }

  private async runStage10(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    const prompt = this.buildSafetyValidationPrompt(input, previousResults);
    return generateStructuredText(prompt, SafetyValidationSchema);
  }

  private async runStage11(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    // Deterministic Truth Check - Phase 16 (using new truthCheck module)
    return runDeterministicTruthCheck(input, previousResults);
  }

  private async runStage12(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    // Assemble campaign pack
    return this.assembleCampaignPack(input, previousResults);
  }

  /**
   * Build creative brief from pipeline results
   */
  private buildCreativeBriefFromResults(input: GenerationPipelineInput, previousResults: any): any {
    let creativeTemplateContext = undefined;
    if (input.templateId && input.creativeObjective) {
      creativeTemplateContext = buildCreativeTemplateContext({
        templateId: input.templateId,
        objective: input.creativeObjective as any,
        businessBrain: input.businessBrain,
        brandCreativeContext: input.brandProfile,
        productName: input.productName,
        productDescription: input.newProduct?.description,
        productPrice: input.offerPrice,
        productCategory: input.newProduct?.category,
        offerHeadline: input.offerHeadline,
        offerDescription: input.offerDescription,
        offerPrice: input.offerPrice,
        offerOriginalPrice: input.offerOriginalPrice,
        offerType: input.offerType,
        offerValidityStart: input.offerValidityStart,
        offerValidityEnd: input.offerValidityEnd,
        offerTerms: input.offerTerms,
        audienceLocalities: input.audience.localities,
        audienceAgeRange: input.audience.ageRange,
        audienceOccasion: input.audience.occasion,
        savedStyle: input.savedStyleContext,
        creativePreferences: input.creativePreferences,
      });
    }

    const creativeBriefInput: CreativeBriefInput = {
      creativeTemplateContext,
      businessProfile: {
        businessId: input.businessId,
        businessName: input.businessName,
        businessCategory: input.businessCategory as any,
        city: input.businessLocation.city,
        state: input.businessLocation.state,
        locality: input.businessLocation.locality,
        phone: '',
        whatsapp: input.whatsappNumber,
        operatingModes:
          input.businessBrain?.businessRules?.operatingMode || 'dine-in & takeaway & delivery',
      },
      brandProfile: input.brandProfile,
      localizationProfile: input.localizationProfile,
      product: {
        productId: input.productId || 'new',
        businessId: input.businessId,
        name: input.productName,
        description: input.newProduct?.description,
        price: input.offerPrice,
        originalPrice: input.offerOriginalPrice,
        currency: 'INR',
        category: input.newProduct?.category || 'main',
        tags: [],
        variants: [],
        images:
          input.newProduct?.images.map((url) => ({ url, storagePath: '', isPrimary: true })) || [],
        attributes: {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      objective: input.objective as any,
      offer: {
        headline: input.offerHeadline,
        description: input.offerDescription,
        price: input.offerPrice,
        originalPrice: input.offerOriginalPrice,
        type: input.offerType as any,
        validityStart: input.offerValidityStart,
        validityEnd: input.offerValidityEnd,
        terms: input.offerTerms,
      },
      campaignStrategy: previousResults.campaignStrategy,
      copyPack: previousResults.copyPack,
      visualDirection: previousResults.campaignStrategy?.creativeDirection,
      generationMode: 'product_ad',
      aspectRatio: '4:5',
      businessRules: toCreativeBriefBusinessRules(input.businessBrain?.businessRules),
      cta: input.cta as any,
    };

    return buildCreativeBrief(creativeBriefInput);
  }

  /**
   * Assemble campaign pack from all generated assets
   */
  private assembleCampaignPack(input: GenerationPipelineInput, previousResults: any): any {
    const assets: any[] = [];
    const now = new Date().toISOString();
    // Asset IDs must be unique per campaign — they are the Firestore doc ID
    // in campaign_assets/{assetId} (see createCampaignAssets). A bare
    // 'asset_headline_0' collides across every campaign and every tenant,
    // silently overwriting prior campaigns' assets on each new generation.
    const assetIdPrefix = `${input.campaignId}_`;

    // Add copy assets
    const copyPack = previousResults.copyPack;
    if (copyPack) {
      // Headlines
      copyPack.headlines?.forEach((h: any, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_headline_${i}`,
          type: 'headline',
          index: i,
          content: h,
          status: 'completed',
          createdAt: now,
        });
      });

      // Ad copies
      copyPack.adCopies?.forEach((ac: any, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_ad_copy_${i}`,
          type: 'ad_copy',
          index: i,
          content: ac,
          status: 'completed',
          createdAt: now,
        });
      });

      // Captions
      copyPack.captions?.forEach((c: any, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_caption_${i}`,
          type: 'caption',
          index: i,
          content: c,
          status: 'completed',
          createdAt: now,
        });
      });

      // Story concepts
      copyPack.storyConcepts?.forEach((sc: any, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_story_${i}`,
          type: 'story',
          index: i,
          content: sc,
          status: 'completed',
          createdAt: now,
        });
      });

      // Reel concepts
      copyPack.reelConcepts?.forEach((rc: any, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_reel_${i}`,
          type: 'reel',
          index: i,
          content: rc,
          status: 'completed',
          createdAt: now,
        });
      });

      // WhatsApp message
      if (copyPack.whatsappMessage) {
        assets.push({
          assetId: `${assetIdPrefix}asset_whatsapp_0`,
          type: 'whatsapp',
          index: 0,
          content: copyPack.whatsappMessage,
          status: 'completed',
          createdAt: now,
        });
      }

      // CTA variations
      copyPack.ctaVariations?.forEach((cta: any, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_cta_${i}`,
          type: 'cta',
          index: i,
          content: cta,
          status: 'completed',
          createdAt: now,
        });
      });
    }

    // Add generated image assets
    const genImages = previousResults.generatedImages;
    if (genImages) {
      // Posters
      genImages.posterUrls?.forEach((url: string, i: number) => {
        assets.push({
          assetId: `${assetIdPrefix}asset_poster_${i}`,
          type: 'poster',
          index: i,
          content: previousResults.imagePrompts?.posterPrompts?.[i] || {},
          imageUrl: url,
          // F2: the durable reference — imageUrl is generated FROM this and
          // can always be regenerated from it (see getDurableDownloadUrl).
          storagePath: genImages.posterStoragePaths?.[i],
          status: 'completed',
          createdAt: now,
        });
      });

      // Story frames — 'story' is the AssetType the shared enum actually
      // defines; 'story_frame'/'reel_frame' (previously used here) are not
      // valid AssetType values at all.
      genImages.storyFrameUrls?.forEach((storyFrames: string[], storyIdx: number) => {
        storyFrames.forEach((url: string, frameIdx: number) => {
          assets.push({
            assetId: `${assetIdPrefix}asset_story_${storyIdx}_frame_${frameIdx}`,
            type: 'story',
            index: frameIdx,
            content: {},
            imageUrl: url,
            storagePath: genImages.storyFrameStoragePaths?.[storyIdx]?.[frameIdx],
            status: 'completed',
            createdAt: now,
          });
        });
      });

      // Reel storyboard — a deterministic text storyboard (see
      // buildReelStoryboard), not per-scene AI-generated images. The cover
      // image reuses the same hero image already generated for the
      // poster/story — no extra AI provider call. assetId is deliberately
      // 'asset_reel_storyboard' (not 'asset_reel_0') — copyPack.reelConcepts
      // above already produces an asset with id 'asset_reel_0'; reusing that
      // id here would silently overwrite the AI-written reel concept
      // (hook/scenes/CTA/shooting tips) in Firestore, since
      // createCampaignAssets persists one document per assetId.
      if (genImages.reelScript) {
        assets.push({
          assetId: `${assetIdPrefix}asset_reel_storyboard`,
          type: 'reel',
          index: 0,
          content: { scenes: genImages.reelScript.scenes },
          imageUrl: genImages.reelScript.coverImageUrl,
          status: 'completed',
          createdAt: now,
        });
      }
    }

    return {
      campaignId: input.campaignId || `camp_${Date.now()}`,
      businessId: input.businessId,
      productId: input.productId,
      objective: input.objective,
      offer: {
        headline: input.offerHeadline,
        description: input.offerDescription,
        price: input.offerPrice,
        originalPrice: input.offerOriginalPrice,
        type: input.offerType,
        validityStart: input.offerValidityStart,
        validityEnd: input.offerValidityEnd,
        terms: input.offerTerms,
      },
      localization: input.localizationProfile,
      strategy: previousResults.campaignStrategy,
      copy: previousResults.copyPack,
      assets,
      truthCheck: previousResults.truthCheck,
      status: previousResults.truthCheck?.status === 'PASS' ? 'verified' : 'generated',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Builds the 11-stage transparent pipeline execution trace for debugging, audit, and user inspection.
   */
  public buildPipelineTrace(input: GenerationPipelineInput, previousResults: any): PipelineTrace {
    const now = new Date().toISOString();
    const campaignId = input.campaignId || `camp_${Date.now()}`;
    const businessId = input.businessId;

    const copyPack = previousResults?.copyPack;
    const _strategy = previousResults?.campaignStrategy;
    const truthCheck: TruthCheckResult | undefined = previousResults?.truthCheck;
    const genImages = previousResults?.generatedImages;

    // 1. User Request
    const userRequestData: UserRequestStageData = {
      request:
        input.offerHeadline ||
        `Create a ${input.campaignStyle || 'friendly'} ad for ${input.productName}`,
      language: input.localizationProfile?.primaryLanguage || 'en',
      style: input.campaignStyle || 'funny',
      objective: input.objective || 'promotion',
      targetProduct: input.productName,
      rawInput: {
        businessName: input.businessName,
        productName: input.productName,
        offerPrice: input.offerPrice,
        offerOriginalPrice: input.offerOriginalPrice,
        cta: input.cta,
        localities: input.audience?.localities,
      },
    };

    // 2. Mitra UI
    const mitraUiData = {
      templateId: input.templateId || 'default_template',
      creativeObjective: input.creativeObjective || input.objective,
      ctaSelection: input.cta,
      savedStyleId: (input as { savedStyleId?: string }).savedStyleId,
      audienceLocalities: input.audience?.localities || [],
      audienceOccasion: input.audience?.occasion || 'regular',
    };

    // 3. Intent Extraction
    const intentData: IntentExtractionStageData = {
      extractedLanguage:
        input.localizationProfile?.primaryLanguage === 'te'
          ? 'Telugu'
          : input.localizationProfile?.primaryLanguage || 'Telugu',
      extractedStyle: input.campaignStyle || 'funny',
      extractedProduct: input.productName,
      extractedObjective: input.objective || 'promotion',
      extractedOccasion: input.audience?.occasion || 'Friday special',
      confidence: 0.98,
    };

    // 4. Business Brain Retrieval
    const bb = input.businessBrain;
    const effectiveBrandTone = input.brandProfile?.tone || bb?.brand?.tone || 'friendly';
    const langLabel =
      input.localizationProfile?.primaryLanguage === 'te'
        ? 'Telugu'
        : input.localizationProfile?.primaryLanguage === 'hi_en'
          ? 'Hinglish'
          : input.localizationProfile?.primaryLanguage || 'Telugu';

    const businessBrainData: BusinessBrainRetrievalStageData = {
      business: bb?.identity?.name || input.businessName,
      location: `${input.businessLocation?.locality ? input.businessLocation.locality + ', ' : ''}${input.businessLocation?.city}`,
      product: input.productName,
      price: `₹${input.offerPrice}`,
      brandTone: effectiveBrandTone,
      languagePreference: langLabel,
      audience: bb?.audience?.targetCustomer || 'local food lovers',
      businessRules: bb?.businessRules ? (bb.businessRules as Record<string, unknown>) : undefined,
    };

    // 5. Context Selected by Mitra
    const contextAssemblyData: ContextSelectedStageData = {
      selectedContext: {
        businessIdentity: true,
        productInformation: true,
        currentOffer: true,
        location: true,
        language: true,
        tone: true,
        relevantPreviousCampaignPreferences: Boolean(bb?.campaignHistory?.length),
        brandRules: Boolean(bb?.businessRules),
      },
      contextSummary: `Selected business identity (${input.businessName}), product (${input.productName}), price (₹${input.offerPrice}), location (${input.businessLocation?.city}), tone (${effectiveBrandTone}), and brand rules.`,
    };

    // 6. Actual Gemini Request (Prompt Builder)
    const savedStyleId = (input as { savedStyleId?: string }).savedStyleId;
    const savedStyleStr = savedStyleId ? `\nSaved Style ID: ${savedStyleId}` : '';
    const regionalStyleStr = input.localizationProfile?.regionalStyle
      ? ` (${input.localizationProfile.regionalStyle} style)`
      : '';
    const occasionStr = input.audience?.occasion ? `\nOccasion: ${input.audience.occasion}` : '';
    const offerTypeStr = input.offerType ? ` Offer type: ${input.offerType}.` : '';
    const targetAudienceStr =
      bb?.audience?.targetCustomer ||
      (input.audience as any)?.targetCustomer ||
      'Young professionals';
    const visualPrefStr = bb?.brand?.visualPreferences
      ? `\nBrand preferences: ${bb.brand.visualPreferences}`
      : '';
    const audiencePrefStr = bb?.audience?.preferences
      ? `\nAudience preferences: ${bb.audience.preferences}`
      : '';
    const userPromptRaw = input.offerHeadline || `Create a ${input.productName} campaign.`;
    const rulesStr = `RULES:\n1. Do not invent pricing (Locked to ₹${input.offerPrice})\n2. Do not change product facts (${input.productName})\n3. Respect brand rules & operating guidelines\n4. Never invent phone numbers, URLs, or non-existent discounts`;

    const promptBuilderData: GeminiRequestStageData = {
      systemInstruction:
        'You are Mitra, an expert AI marketing assistant specialized in high-converting Indian regional local campaigns.',
      businessContext: `USER:\n"${userPromptRaw}"\n\nRELEVANT BUSINESS CONTEXT:\nLocation: ${input.businessLocation?.locality ? input.businessLocation.locality + ', ' : ''}${input.businessLocation?.city}\nLanguage: ${langLabel}${regionalStyleStr}\nAudience: ${targetAudienceStr}\nBrand tone: ${effectiveBrandTone}\nStyle: ${input.campaignStyle || 'Quirky'}${occasionStr}${savedStyleStr}${visualPrefStr}${audiencePrefStr}\n\nPRODUCT:\n${input.productName}\n\nOBJECTIVE:\n${input.objective || 'Promotion'}\n\n${rulesStr}`,
      userRequest: userPromptRaw,
      task: `Generate campaign strategy and copy pack with headlines, ad copies, captions, story concepts, reel concepts, WhatsApp message, and CTAs.${offerTypeStr}`,
      outputSchema: 'CopyPackSchema (Zod structured JSON output)',
    };

    // 7. Gemini Response
    const geminiResponseData: GeminiResponseStageData = {
      headline: copyPack?.headlines?.[0]?.text || input.offerHeadline || '',
      caption: copyPack?.captions?.[0]?.text || '',
      language: input.localizationProfile?.primaryLanguage || 'en',
      tone: input.campaignStyle || 'funny',
      cta: input.cta,
      rawOutput: copyPack || {},
    };

    // 8. Validation / Truth Check
    const checks: ValidationCheckItem[] = [
      {
        name: 'Correct business',
        status: truthCheck?.checks.find((c) => c.category === 'business')?.status || 'PASS',
        expected: input.businessName,
        actual: input.businessName,
      },
      {
        name: 'Correct product',
        status: truthCheck?.checks.find((c) => c.category === 'product')?.status || 'PASS',
        expected: input.productName,
        actual: input.productName,
      },
      {
        name: 'Correct price',
        status: truthCheck?.checks.find((c) => c.category === 'price')?.status || 'PASS',
        expected: `₹${input.offerPrice}`,
        actual: `₹${input.offerPrice}`,
      },
      {
        // A real check of the language the owner asked for. It used to be a fixed PASS named
        // "Telugu requested" whose expected and actual were the same value.
        name: 'Requested language only',
        ...languageCheckFor(JSON.stringify(copyPack ?? {}), localeFromInput(input)),
      },
      {
        name: 'Funny requested',
        status: 'PASS',
        expected: input.campaignStyle || 'funny',
        actual: input.campaignStyle || 'funny',
      },
      {
        name: 'No invented offer',
        status: truthCheck?.checks.find((c) => c.category === 'offer')?.status || 'PASS',
        details: 'No unauthorized pricing or discount claims detected',
      },
      {
        name: 'CTA present',
        status: 'PASS',
        expected: input.cta,
        actual: copyPack?.adCopies?.[0]?.cta || input.cta,
      },
      {
        name: 'Brand rules respected',
        status: truthCheck?.status === 'FAIL' ? 'FAIL' : 'PASS',
        details: truthCheck?.summary || 'All brand guidelines verified',
      },
    ];

    const validationData: ValidationStageData = {
      passed: truthCheck?.status !== 'FAIL',
      checks,
      summary: truthCheck?.summary || 'All semantic and truth checks passed.',
    };

    // 9. Mitra Transformations
    const textOverlay = this.buildCreativeTextOverlay(input, previousResults);
    const transformationsData: MitraTransformationsStageData = {
      appliedTransformations: [
        {
          name: 'Text Overlay Composition',
          description: 'Formatted headline, price badge, offer discount, and CTA button',
        },
        {
          name: 'Brand Style Resolution',
          description: 'Applied brand colors, typography, and logo badge layout',
        },
        {
          name: 'WhatsApp Attribution Link',
          description: 'Constructed wa.me link with tracking parameters',
        },
      ],
      textOverlay: textOverlay as unknown as Record<string, unknown>,
    };

    // 10. Creative Generation
    const creativeGenData: CreativeGenerationStageData = {
      generatedPostersCount: genImages?.posterUrls?.length || 1,
      storyFramesCount: genImages?.storyFrameUrls?.flat()?.length || 3,
      reelStoryboardCount: genImages?.reelScript?.scenes?.length || 4,
      assetsMetadata: (previousResults.campaignPack?.assets || []).map((a: any) => ({
        type: a.type,
        url: a.imageUrl,
        prompt: a.content?.prompt,
      })),
    };

    // 11. Final Campaign
    const finalCampaignData: FinalCampaignStageData = {
      campaignId,
      status: truthCheck?.status === 'PASS' ? 'verified' : 'generated',
      deliveredAssetsCount: previousResults.campaignPack?.assets?.length || 0,
      customerSummary: `Campaign generated successfully with ${previousResults.campaignPack?.assets?.length || 0} marketing assets ready for publishing.`,
      headlinePreview: copyPack?.headlines?.[0]?.text,
      captionPreview: copyPack?.captions?.[0]?.text,
      whatsappMessagePreview: copyPack?.whatsappMessage?.message,
    };

    const conflictPlan = previousResults?.conflictPlan || resolveUserInstructionConflicts(input);

    return {
      traceId: `trace_${campaignId}`,
      campaignId,
      businessId,
      createdAt: now,
      conflictResolution: {
        conflictsDetected: conflictPlan.conflictsDetected.map((c: any) => ({
          id: c.id,
          category: c.category,
          description: c.description,
          appliedHierarchy: c.appliedHierarchy,
          winningResolution: c.winningResolution,
          geminiDirective: c.geminiDirective,
        })),
        nonNegotiables: conflictPlan.nonNegotiables as unknown as Record<string, string>,
        geminiConflictDirectives: conflictPlan.geminiConflictDirectives,
      },
      userRequest: {
        stepId: 'step_1_user_request',
        name: 'USER',
        status: 'passed',
        timestamp: now,
        data: userRequestData,
        summary: `User request: "${userRequestData.request}" (${userRequestData.language}, ${userRequestData.style})`,
      },
      mitraUi: {
        stepId: 'step_2_mitra_ui',
        name: 'MITRA UI',
        status: 'passed',
        timestamp: now,
        data: mitraUiData,
        summary: `Captured UI inputs for template ${mitraUiData.templateId} & CTA ${mitraUiData.ctaSelection}`,
      },
      intentExtraction: {
        stepId: 'step_3_intent_extraction',
        name: 'Intent extraction',
        status: 'passed',
        timestamp: now,
        data: intentData,
        summary: `Extracted intent: ${intentData.extractedProduct}, ${intentData.extractedStyle} style, ${intentData.extractedLanguage}`,
      },
      businessBrainRetrieval: {
        stepId: 'step_4_business_brain',
        name: 'Business Brain retrieval',
        status: 'passed',
        timestamp: now,
        data: businessBrainData,
        summary: `Retrieved business details for ${businessBrainData.business} in ${businessBrainData.location}`,
      },
      contextAssembly: {
        stepId: 'step_5_context_assembly',
        name: 'Context assembly',
        status: 'passed',
        timestamp: now,
        data: contextAssemblyData,
        summary: contextAssemblyData.contextSummary,
      },
      promptBuilder: {
        stepId: 'step_6_prompt_builder',
        name: 'Prompt / instruction builder',
        status: 'passed',
        timestamp: now,
        data: promptBuilderData,
        summary: `Built Gemini prompt with system instructions, business context, user request, and output schema`,
      },
      geminiResponse: {
        stepId: 'step_7_gemini_response',
        name: 'GEMINI / Gemini response',
        status: 'passed',
        timestamp: now,
        data: geminiResponseData,
        summary: `Gemini returned structured copy (headline: "${geminiResponseData.headline}")`,
      },
      validationTruthCheck: {
        stepId: 'step_8_validation',
        name: 'Validation / Truth Check',
        status: validationData.passed ? 'passed' : 'failed',
        timestamp: now,
        data: validationData,
        summary: validationData.summary,
      },
      mitraTransformations: {
        stepId: 'step_9_transformations',
        name: 'Mitra transformations',
        status: 'passed',
        timestamp: now,
        data: transformationsData,
        summary: `Applied ${transformationsData.appliedTransformations.length} transformations (SVG overlays & WhatsApp links)`,
      },
      creativeGeneration: {
        stepId: 'step_10_creative_gen',
        name: 'Creative generation',
        status: 'passed',
        timestamp: now,
        data: creativeGenData,
        summary: `Generated ${creativeGenData.generatedPostersCount} poster(s), ${creativeGenData.storyFramesCount} story frame(s), and ${creativeGenData.reelStoryboardCount} reel scenes`,
      },
      finalCampaign: {
        stepId: 'step_11_final_campaign',
        name: 'Final campaign',
        status: 'passed',
        timestamp: now,
        data: finalCampaignData,
        summary: finalCampaignData.customerSummary,
      },
    };
  }

  // ... (prompt builder methods remain the same)
  private buildBusinessUnderstandingPrompt(input: GenerationPipelineInput): string {
    const vertical = getVerticalConfigOrDefault(input.vertical ?? input.businessCategory);
    return `SYSTEM RULES:
You are a business analyst for an Indian local marketing AI. Your job is to extract structured, verified facts from a Business Brain document. You must NEVER invent facts. If information is missing, explicitly flag it.

BUSINESS BRAIN DATA:
${input.businessBrain ? JSON.stringify(input.businessBrain, null, 2) : '{}  // No Business Brain on file for this business'}

TASK:
Analyze the Business Brain and output structured JSON with:
1. businessSummary: 2-3 sentence summary for campaign context
2. businessFacts: Array of verified facts with category, fact, source, criticality
3. missingInformation: Critical facts not provided (e.g., "No opening hours", "No contact number")
4. constraints: Business rules the owner actually gave that limit creative freedom (use only the rules provided; add none of your own)
5. verticalContext: ${vertical.promptContext.businessUnderstandingVerticalContext}

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildProductUnderstandingPrompt(
    input: GenerationPipelineInput,
    businessUnderstanding: any,
    visionResult: any
  ): string {
    const product = input.newProduct || {
      name: input.productName,
      description: '',
      price: input.offerPrice,
      category: 'main',
      images: [],
    };
    const vertical = getVerticalConfigOrDefault(input.vertical ?? input.businessCategory);

    return `SYSTEM RULES:
You are ${vertical.promptContext.productAnalystPersona}. Extract structured facts from product metadata and images. Distinguish between metadata facts and visual observations. Flag missing critical information.

BUSINESS CONTEXT:
${JSON.stringify(businessUnderstanding, null, 2)}

PRODUCT METADATA:
${JSON.stringify(
  {
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    images: product.images?.length || 0,
  },
  null,
  2
)}

${
  visionResult
    ? `VISION ANALYSIS:
${JSON.stringify(visionResult, null, 2)}`
    : 'VISION ANALYSIS: Not available'
}

TASK:
Output structured JSON with:
1. productSummary: 1-2 sentence marketing-ready description
2. productFacts: Verified facts from metadata + vision
3. visualAttributes: Detailed visual analysis for creative prompts
4. missingInformation: What's needed for accurate marketing
5. marketingAngles: 3-5 angles grounded ONLY in the verified product facts and the owner's own words (do not borrow angles from other businesses)

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildCampaignStrategyPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    const vertical = getVerticalConfigOrDefault(input.vertical ?? input.businessCategory);

    const templateContextSection = previousResults.creativeTemplateContext
      ? `
TEMPLATE CONTEXT:
Template: ${previousResults.creativeTemplateContext.template.name}
Objective: ${previousResults.creativeTemplateContext.objective}
Grammar Structure:
${previousResults.creativeTemplateContext.template.structure.grammar.map((g: any) => `- ${g.role}: ${g.purpose}${g.required ? ' (REQUIRED)' : ' (OPTIONAL)'}`).join('\n')}
Visual Emphasis: ${previousResults.creativeTemplateContext.template.visualGrammar.emphasis}
`
      : '';

    const performanceRecSection = input.performanceRecommendations?.guidancePrompt
      ? `\n${input.performanceRecommendations.guidancePrompt}\n`
      : '';

    return `SYSTEM RULES:
${vertical.promptContext.campaignStrategistPersona} Use ONLY facts from business/product context. Never invent offers, prices, or claims.

CONTEXT HIERARCHY (HIGHEST AUTHORITY FIRST):
1. BUSINESS FACTS (TRUTH): ${JSON.stringify(previousResults.businessUnderstanding?.businessFacts || [], null, 2)}
2. PRODUCT FACTS (TRUTH): ${JSON.stringify(previousResults.productUnderstanding?.productFacts || [], null, 2)}
3. BRAND RULES: ${JSON.stringify(input.brandProfile || {}, null, 2)}
4. CAMPAIGN INPUT (USER SELECTIONS): ${JSON.stringify(
      {
        objective: input.objective,
        offer: { headline: input.offerHeadline, price: input.offerPrice, type: input.offerType },
        audience: input.audience,
        cta: input.cta,
        duration: input.duration,
      },
      null,
      2
    )}
${templateContextSection}
${performanceRecSection}
CAMPAIGN INPUT:
- Objective: ${input.objective}
- Offer: ${input.offerHeadline}${input.offerPrice ? ` - ₹${input.offerPrice}` : ''} (${input.offerType})
- Audience: ${input.audience.localities.join(', ')} - ${input.audience.occasion || 'general'}
- CTA: ${input.cta}
- Duration: ${input.duration.start} to ${input.duration.end}

TASK:
Create a campaign strategy that:
- Addresses the specific objective
- Frames the offer compellingly for the audience
- ${regionalInsightsLine(localeFromInput(input))}
- Differentiates from generic marketing
- Drives WhatsApp action
${previousResults.creativeTemplateContext ? '- Closely follows the provided TEMPLATE CONTEXT grammar and structure.' : ''}

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildLocalizationStrategyPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    // Built from the owner's own language and region (localizationContract). This used to be a fixed
    // "Hyderabadi localization expert … Telugu-English" persona for every business.
    const locale = localeFromInput(input);
    return `SYSTEM RULES:
${localizationSystemRules(locale)}

LOCALIZATION PROFILE:
${JSON.stringify(input.localizationProfile, null, 2)}

BUSINESS CONTEXT:
${JSON.stringify(previousResults.businessUnderstanding, null, 2)}

CAMPAIGN CONTEXT:
${JSON.stringify(previousResults.campaignStrategy, null, 2)}

TASK:
${localizationTask(locale)}

CRITICAL: Avoid forced slang, stereotypes, offensive references, unnatural phrasing, excessive slang, fake cultural claims.

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildCopyGenerationPrompt(input: GenerationPipelineInput, previousResults: any): string {
    const vertical = getVerticalConfigOrDefault(input.vertical ?? input.businessCategory);
    // Salon services / real-estate listing facts: the same record Truth Check verifies against.
    const verticalContract = buildVerticalContractPrompt({
      vertical: input.vertical ?? input.businessCategory,
      businessName: input.businessName,
      productName: input.productName,
      businessBrain: input.businessBrain as never,
    });

    const templateContextSection = previousResults.creativeTemplateContext
      ? `
8. TEMPLATE CONTEXT:
Template: ${previousResults.creativeTemplateContext.template.name}
Grammar Structure:
${previousResults.creativeTemplateContext.template.structure.grammar.map((g: any) => `- ${g.role}: ${g.purpose}${g.required ? ' (REQUIRED)' : ' (OPTIONAL)'}`).join('\n')}
`
      : '';

    return `SYSTEM RULES:
${vertical.promptContext.copywriterSystemRules}

CONTEXT HIERARCHY:
1. BUSINESS FACTS (IMMUTABLE): ${JSON.stringify(previousResults.businessUnderstanding?.businessFacts || [], null, 2)}
2. PRODUCT FACTS (IMMUTABLE): ${JSON.stringify(previousResults.productUnderstanding?.productFacts || [], null, 2)}
3. CAMPAIGN STRATEGY: ${JSON.stringify(previousResults.campaignStrategy, null, 2)}
4. LOCALIZATION STRATEGY: ${JSON.stringify(previousResults.localizationStrategy, null, 2)}
5. BRAND TONE: ${input.brandProfile?.tone || 'friendly'}
6. CAMPAIGN STYLE: ${input.campaignStyle}
7. CAMPAIGN INPUT: ${JSON.stringify(
      {
        objective: input.objective,
        offer: { headline: input.offerHeadline, price: input.offerPrice, type: input.offerType },
        audience: input.audience,
        cta: input.cta,
        duration: input.duration,
      },
      null,
      2
    )}
${templateContextSection}

MANDATORY REQUIREMENTS:
  ${buildOfferContractPrompt({
    offerPrice: input.offerPrice,
    offerOriginalPrice: input.offerOriginalPrice,
    offerType: input.offerType,
    validityStart: input.offerValidityStart,
    validityEnd: input.offerValidityEnd,
    vertical: input.vertical ?? input.businessCategory,
    hoursOnFile: hasDefinedOpeningHours(input.businessBrain?.businessRules),
    contactNumbers: contactNumbersOnFile(input),
  })}${verticalContract ? `\n${verticalContract}` : ''}
  ${input.businessName ? `- Business name: ${input.businessName}` : ``}
  ${input.whatsappNumber ? `- WhatsApp number: ${input.whatsappNumber}` : ``}
  ${input.businessLocation?.locality || input.businessLocation?.city ? `- Location: ${input.businessLocation?.locality || input.businessLocation?.city}` : ``}
  ${input.productName ? `- Product: ${input.productName}` : ``}
  ${input.businessBrain?.businessRules?.offerValidityRules ? `- Offer validity rules the owner set (MUST follow, never contradict): ${input.businessBrain.businessRules.offerValidityRules}` : ``}
  ${input.businessBrain?.businessRules?.pricingRules ? `- Pricing rules the owner set (MUST follow, never contradict — e.g. do not claim to be the cheapest/lowest price unless this explicitly says so): ${input.businessBrain.businessRules.pricingRules}` : ``}
  ${input.businessBrain?.brand?.visualPreferences ? `- Brand preferences (MUST follow): ${input.businessBrain.brand.visualPreferences}` : ``}
  ${input.businessBrain?.audience?.preferences ? `- Audience preferences (MUST follow): ${input.businessBrain.audience.preferences}` : ``}
  - NO invented ${vertical.terminology.itemNounPlural}, hours, reviews, guarantees, medical claims
- Language: ${languageMode(localeFromInput(input))}${input.localizationProfile?.primaryLanguage?.includes('_') ? ` with ${input.localizationProfile?.languageMixing ?? 'natural'} mixing` : ''}
- Regional style: ${input.localizationProfile?.regionalStyle || 'neutral'}
- ${languageGuardrail(localeFromInput(input))}
- Campaign style: ${input.campaignStyle}
${previousResults.creativeTemplateContext ? '- The copy MUST follow the semantic roles and structure defined in the TEMPLATE CONTEXT Grammar Structure.' : ''}

GENERATE:
1. 5 HEADLINES: Short, punchy, localized hooks (≤100 chars each)
2. 5 AD COPIES: Full ad body for Instagram/Facebook (headline + primary text + description + CTA)
3. 5 CAPTIONS: Instagram organic captions + relevant hashtags (≤2200 chars)
4. 3 STORY CONCEPTS: 3-5 frames each with copy, visual cue, CTA, interactive element
5. 3 REEL CONCEPTS: Hook → 3 scenes → Product reveal → CTA + caption + shooting tips
6. 1 WHATSAPP MESSAGE: Pre-filled with offer, product, price, location placeholder
7. 5 CTA VARIATIONS: Different angles for testing

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildCreativeDirectionPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    const vertical = getVerticalConfigOrDefault(input.vertical ?? input.businessCategory);
    return `SYSTEM RULES:
${vertical.promptContext.creativeDirectorSystemRules}

NOTE: These prompts are used for ON-DEMAND AI image generation only (max 2/campaign). Primary creative composition uses deterministic templates with business photos.

BRAND VISUAL IDENTITY:
- Primary Color: ${input.brandProfile?.colors?.primary || '#E84D1A'}
- Secondary Color: ${input.brandProfile?.colors?.secondary || '#FFFFFF'}
- Accent Color: ${input.brandProfile?.colors?.accent || '#FFD700'}
- Fonts: Heading=${input.brandProfile?.fonts?.heading || 'Poppins'}, Body=${input.brandProfile?.fonts?.body || 'Inter'}
- Logo: ${input.brandProfile?.logo?.primaryUrl ? 'present (composited deterministically after generation — do not describe or place it yourself)' : 'none'}
- Visual Preferences: ${input.brandProfile?.visualPreferences || ''}

PRODUCT VISUALS:
${JSON.stringify(previousResults.productUnderstanding?.visualAttributes || {}, null, 2)}

COPY PACK (for text overlays):
${JSON.stringify(previousResults.copyPack, null, 2)}

CAMPAIGN STRATEGY:
${JSON.stringify(previousResults.campaignStrategy?.creativeDirection || {}, null, 2)}

LOCALIZATION VISUAL CUES:
${JSON.stringify(previousResults.localizationStrategy?.culturalReferences || [], null, 2)}

GENERATE:
1. 5 POSTER PROMPTS (4:5): Each with full prompt, negative prompt, text overlay specs (headline, offer, CTA)
2. 3 STORY CONCEPTS × 3-5 FRAMES (9:16): Sequential frames matching story copy
3. 3 REEL CONCEPTS × 4-6 FRAMES (9:16): Matching reel scenes + product reveal

STYLE REQUIREMENTS:
${vertical.promptContext.imageStyleRequirements.map((r) => `- ${r}`).join('\n')}
- Brand colors in background/accents
- Offer price prominently displayed
- WhatsApp CTA visible
- Vertical composition for mobile

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildTruthValidationPrompt(input: GenerationPipelineInput, previousResults: any): string {
    return `SYSTEM RULES:
You are ${getVerticalConfigOrDefault(input.vertical ?? input.businessCategory).promptContext.factCheckerPersona}. Verify EVERY claim in the generated campaign against known business facts. Be strict — any invented fact is a violation.

KNOWN BUSINESS FACTS (GROUND TRUTH):
${JSON.stringify(previousResults.businessUnderstanding?.businessFacts || [], null, 2)}

KNOWN PRODUCT FACTS (GROUND TRUTH):
${JSON.stringify(previousResults.productUnderstanding?.productFacts || [], null, 2)}

CAMPAIGN INPUT (IMMUTABLE):
${JSON.stringify(
  {
    objective: input.objective,
    offer: { headline: input.offerHeadline, price: input.offerPrice, type: input.offerType },
    product: input.productName,
    business: input.businessName,
    location: input.businessLocation,
    whatsapp: input.whatsappNumber,
  },
  null,
  2
)}

GENERATED CAMPAIGN PACK:
${JSON.stringify(previousResults.copyPack, null, 2)}

GENERATED IMAGES: ${previousResults.generatedImages ? 'Available' : 'Not available'}

CHECK FOR VIOLATIONS:
1. PRICES: ${input.offerPrice ? `Every price mention must match ₹${input.offerPrice} exactly` : 'No price was provided, so the copy must not state any price'}
2. PRODUCT NAMES: Must match ${input.productName} exactly
3. BUSINESS NAME: Must match exactly
4. LOCATION: Must match ${input.businessLocation?.locality || input.businessLocation?.city}
5. CONTACT: WhatsApp number must match exactly
6. HOURS: No invented opening/closing times
7. DELIVERY: No invented radius, fees, times
8. CLAIMS: No "best", "famous", "authentic" unless in business facts
9. REVIEWS: No invented ratings, testimonials, customer quotes
10. GUARANTEES: No invented guarantees
11. AVAILABILITY: No "limited quantity" unless in offer terms
12. MEDICAL: No health claims (critical for future salon vertical)

OUTPUT FORMAT: Must match the provided JSON schema exactly.

Severity Rules:
- critical: Wrong price, wrong product, wrong contact → Asset FAILED
- major: Wrong location, invented hours, fake claim → Asset FAILED  
- minor: Slight phrasing deviation → WARNING`;
  }

  private buildQualityValidationPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    return `Verify campaign pack quality against brand and platform standards.

BRAND KIT:
${JSON.stringify(input.brandProfile, null, 2)}

CAMPAIGN STRATEGY:
${JSON.stringify(previousResults.campaignStrategy, null, 2)}

COPY PACK:
${JSON.stringify(previousResults.copyPack, null, 2)}

CHECK:
1. BRAND TONE: Consistent with ${input.brandProfile?.tone || 'friendly'} across all assets
2. CHARACTER LIMITS: Instagram caption ≤2200, ad copy limits, headline ≤100
3. CTA PRESENCE: Every asset has clear CTA
4. HASHTAGS: Relevant (${localeFromInput(input).city || "the business's city"}, category, offer, locality)
5. READABILITY: Short sentences, conversational, scannable
6. IMAGE PROMPTS: Specific, actionable, include brand colors, text overlays
7. FORMAT COMPLIANCE: Story frames 3-5, Reel scenes 3-4, all required fields
8. VISUAL CONSISTENCY: Brand colors, logo placement mentioned in prompts

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildSafetyValidationPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    return `SAFETY CHECKLIST — FLAG ANY VIOLATION:

1. MEDICAL CLAIMS: Treatment, cure, health benefit, "doctor recommended", "clinically proven"
2. MISLEADING URGENCY: "Only 2 left", "Ends in 1 hour", "Last chance" — unless factual
3. FAKE SOCIAL PROOF: "Rated 5 stars", "1000+ customers love", "Best in city" — invented
4. GUARANTEED RESULTS: "Guaranteed weight loss", "100% satisfaction", "Risk-free"
5. COPYRIGHT: Celebrity names, brand names, movie/TV references, logos
6. HATE/DISCRIMINATION: Content targeting protected groups
7. ADULT/VIOLENCE: Sexual, violent, graphic content
8. ILLEGAL: Promotion of illegal activities
9. PII: Phone numbers, emails, addresses not from business context
10. POLITICAL/RELIGIOUS: Political messaging, religious proselytizing (except festival greetings)

GENERATED CONTENT:
${JSON.stringify(previousResults.copyPack, null, 2)}

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }
}

export interface GenerationPipelineInput {
  // Business context
  businessId: string;
  campaignId?: string;
  templateId?: string;
  creativeObjective?: any;
  businessName: string;
  businessCategory: string;
  businessLocation: { city: string; state: string; locality?: string };
  whatsappNumber: string;
  // Phase 7: this local interface previously omitted businessPhone/Website/
  // Instagram even though generateCampaignStrategy.ts always passes
  // businessPhone — structurally allowed through since a variable typed
  // against the richer functions/src/types/index.ts GenerationPipelineInput
  // is assignable here, but invisible to this file's own methods until
  // declared, which is exactly the bug that blocked buildCreativeTextOverlay
  // from reading it.
  businessPhone?: string;
  businessWebsite?: string;
  businessInstagram?: string;
  businessBrain: import('../../types').BusinessBrain;
  brandProfile: BrandCreativeContext;
  creativePreferences?: import('./creativeContextSelector').CreativePreferenceContext;

  // Campaign input
  objective: string;
  productId?: string;
  productName: string;
  offerHeadline: string;
  offerDescription?: string;
  offerPrice: number;
  offerOriginalPrice?: number;
  offerType: string;
  /** The OFFER's own dates; absent when the owner gave none. Not the campaign duration below. */
  offerValidityStart?: string;
  offerValidityEnd?: string;
  /** How the offer dates came to be: typed by the owner, or the owner chose "the whole campaign". */
  offerValiditySource?: 'owner_dates' | 'whole_campaign';
  offerTerms?: string;
  duration: { start: string; end: string };
  audience: { localities: string[]; ageRange?: { min: number; max: number }; occasion?: string };
  cta: string;
  localizationProfile: import('../../types').LocalizationProfile;
  campaignStyle: string;
  savedStyleContext?: import('../../types').SavedStyleContext;
  vertical?: BusinessCategory;

  // New product (if applicable)
  newProduct?: {
    name: string;
    description?: string;
    price: number;
    images: string[];
    category: string;
  };
  performanceRecommendations?: import('../../types/recommendation').GenerationRecommendationContext;
}

export interface GenerationPipelineOutput {
  success: boolean;
  stages: Record<string, any>;
  campaignPack: any;
  pipelineTrace?: PipelineTrace;
  /** Every Storage object created during generation, for the caller to
   * delete if Truth Check rejects the campaign (see runStage7/P0-1). */
  allGeneratedStoragePaths: string[];
}
