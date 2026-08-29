import { analyzeProductImages, generateStructuredText, generateImage } from './index';
import { buildCreativeBrief, type CreativeBriefInput } from './creativeBrief';
import { buildImagePromptPack, buildStoryFramePrompts, buildReelFramePrompts, type ImagePrompt } from './imagePromptBuilder';
import { runDeterministicTruthCheck } from './truthCheck';
import { z } from 'zod';

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
    .min(10),
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
    foodies: z.array(z.string()),
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
  async execute(input: GenerationPipelineInput): Promise<GenerationPipelineOutput> {
    const stageResults: {
      businessUnderstanding?: any;
      productUnderstanding?: any;
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
    } = {};

    try {
      // Stage 1: Business Understanding
      console.log('Stage 1: Business Understanding');
      stageResults.businessUnderstanding = await this.runStage1(input);

      // Stage 2: Product/Image Understanding
      console.log('Stage 2: Product/Image Understanding');
      stageResults.productUnderstanding = await this.runStage2(
        input,
        stageResults['businessUnderstanding']
      );

      // Stage 3: Campaign Strategy
      console.log('Stage 3: Campaign Strategy');
      stageResults.campaignStrategy = await this.runStage3(input, stageResults);

      // Stage 4: Localization Strategy
      console.log('Stage 4: Localization Strategy');
      stageResults.localizationStrategy = await this.runStage4(input, stageResults);

      // Stage 5: Copy Generation
      console.log('Stage 5: Copy Generation');
      stageResults.copyPack = await this.runStage5(input, stageResults);

      // Stage 6: Creative Direction / Image Prompts
      console.log('Stage 6: Creative Direction');
      stageResults.imagePrompts = await this.runStage6(input, stageResults);

      // Stage 7: Image Generation (AI provider)
      console.log('Stage 7: Image Generation');
      stageResults.generatedImages = await this.runStage7(input, stageResults);

      // Stage 8: Truth Validation (AI-based)
      console.log('Stage 8: Truth Validation');
      stageResults.truthValidation = await this.runStage8(input, stageResults);

      // Stage 9: Quality Validation (AI-based)
      console.log('Stage 9: Quality Validation');
      stageResults.qualityValidation = await this.runStage9(input, stageResults);

      // Stage 10: Safety Validation (AI-based)
      console.log('Stage 10: Safety Validation');
      stageResults.safetyValidation = await this.runStage10(input, stageResults);

      // Stage 11: Truth Check (Deterministic - Phase 16)
      console.log('Stage 11: Truth Check (Deterministic)');
      stageResults.truthCheck = await this.runStage11(input, stageResults);

      // Stage 12: Campaign Assembly
      console.log('Stage 12: Campaign Assembly');
      stageResults.campaignPack = await this.runStage12(input, stageResults);

      // Stage 13: Save Results (handled by caller)

      return {
        success: true,
        stages: stageResults,
        campaignPack: stageResults.campaignPack,
      };
    } catch (error) {
      console.error('Pipeline failed:', error);
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

  private async runStage3(input: GenerationPipelineInput, previousResults: any): Promise<any> {
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

  private async runStage7(input: GenerationPipelineInput, previousResults: any): Promise<any> {
    // Build creative brief from all previous stages
    const creativeBrief = this.buildCreativeBriefFromResults(input, previousResults);

    // Generate poster images (5)
    const posterPrompts = buildImagePromptPack(creativeBrief, 5);
    const posterUrls: string[] = [];
    const generationMetadata: any[] = [];

    for (let i = 0; i < posterPrompts.length; i++) {
      const prompt = posterPrompts[i];
      if (!prompt) continue;
      const startTime = Date.now();
      const result = await generateImage(prompt);
      const latencyMs = Date.now() - startTime;

      if (result.success && result.imageUrl) {
        posterUrls.push(result.imageUrl);
        generationMetadata.push({
          assetType: 'poster',
          index: i,
          prompt: prompt.prompt,
          provider: result.provider || 'unknown',
          model: result.model || 'unknown',
          latencyMs,
        });
      } else {
        // Fallback: use placeholder or retry logic
        console.warn(`Poster ${i} generation failed:`, result.error);
        // For MVP, we'll use a placeholder - in production, implement retry
        posterUrls.push(`https://via.placeholder.com/1024x1280/E84D1A/FFFFFF?text=Poster+${i+1}`);
        generationMetadata.push({
          assetType: 'poster',
          index: i,
          prompt: prompt.prompt,
          provider: 'placeholder',
          model: 'placeholder',
          latencyMs,
          error: result.error?.message,
        });
      }
    }

    // Generate story frames (3 stories × 4 frames)
    const storyFramePrompts = buildStoryFramePrompts(creativeBrief, 4);
    const storyFrameUrls: string[][] = [];

    for (let storyIdx = 0; storyIdx < 3; storyIdx++) {
      const storyFrames: string[] = [];
      for (let frameIdx = 0; frameIdx < 4; frameIdx++) {
        const promptIndex = storyIdx * 4 + frameIdx;
        const prompt = storyFramePrompts[promptIndex];
        if (!prompt) continue;
        const startTime = Date.now();
        const result = await generateImage(prompt);
        const latencyMs = Date.now() - startTime;

          if (result.success && result.imageUrl) {
            storyFrames.push(result.imageUrl);
            generationMetadata.push({
              assetType: 'story',
              storyIndex: storyIdx,
              frameIndex: frameIdx,
              prompt: prompt.prompt,
              provider: result.provider || 'unknown',
              model: result.model || 'unknown',
              latencyMs,
            });
          } else {
            storyFrames.push(`https://via.placeholder.com/1080x1920/E84D1A/FFFFFF?text=Story+${storyIdx+1}+Frame+${frameIdx+1}`);
            generationMetadata.push({
              assetType: 'story',
              storyIndex: storyIdx,
              frameIndex: frameIdx,
              prompt: prompt.prompt,
              provider: 'placeholder',
              model: 'placeholder',
              latencyMs,
              error: result.error?.message,
            });
          }
        }
        storyFrameUrls.push(storyFrames);
      }

      // Generate reel frames (3 reels × 5 frames)
    const reelFramePrompts = buildReelFramePrompts(creativeBrief, 5);
    const reelFrameUrls: string[][] = [];

    for (let reelIdx = 0; reelIdx < 3; reelIdx++) {
      const reelFrames: string[] = [];
      for (let frameIdx = 0; frameIdx < 5; frameIdx++) {
        const promptIndex = reelIdx * 5 + frameIdx;
        const prompt = reelFramePrompts[promptIndex];
        if (!prompt) continue;
        const startTime = Date.now();
        const result = await generateImage(prompt);
        const latencyMs = Date.now() - startTime;

        if (result.success && result.imageUrl) {
          reelFrames.push(result.imageUrl);
          generationMetadata.push({
            assetType: 'reel',
            reelIndex: reelIdx,
            frameIndex: frameIdx,
            prompt: prompt.prompt,
            provider: result.provider || 'unknown',
            model: result.model || 'unknown',
            latencyMs,
          });
        } else {
          reelFrames.push(`https://via.placeholder.com/1080x1920/E84D1A/FFFFFF?text=Reel+${reelIdx+1}+Scene+${frameIdx+1}`);
          generationMetadata.push({
            assetType: 'reel',
            reelIndex: reelIdx,
            frameIndex: frameIdx,
            prompt: prompt.prompt,
            provider: 'placeholder',
            model: 'placeholder',
            latencyMs,
            error: result.error?.message,
          });
        }
      }
      reelFrameUrls.push(reelFrames);
    }

    return {
      posterUrls,
      storyFrameUrls,
      reelFrameUrls,
      generationMetadata,
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
    const creativeBriefInput: CreativeBriefInput = {
      businessProfile: {
        businessId: input.businessId,
        businessName: input.businessName,
        businessCategory: input.businessCategory as any,
        city: input.businessLocation.city,
        state: input.businessLocation.state,
        locality: input.businessLocation.locality,
        phone: '',
        whatsapp: input.whatsappNumber,
        operatingModes: 'dine-in & takeaway & delivery',
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
        images: input.newProduct?.images.map((url) => ({ url, storagePath: '', isPrimary: true })) || [],
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
      businessRules: input.businessBrain?.businessRules || {},
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

    // Add copy assets
    const copyPack = previousResults.copyPack;
    if (copyPack) {
      // Headlines
      copyPack.headlines?.forEach((h: any, i: number) => {
        assets.push({
          assetId: `asset_headline_${i}`,
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
          assetId: `asset_ad_copy_${i}`,
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
          assetId: `asset_caption_${i}`,
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
          assetId: `asset_story_${i}`,
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
          assetId: `asset_reel_${i}`,
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
          assetId: 'asset_whatsapp_0',
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
          assetId: `asset_cta_${i}`,
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
          assetId: `asset_poster_${i}`,
          type: 'poster',
          index: i,
          content: previousResults.imagePrompts?.posterPrompts?.[i] || {},
          imageUrl: url,
          status: 'completed',
          createdAt: now,
        });
      });

      // Story frames
      genImages.storyFrameUrls?.forEach((storyFrames: string[], storyIdx: number) => {
        storyFrames.forEach((url: string, frameIdx: number) => {
          assets.push({
            assetId: `asset_story_${storyIdx}_frame_${frameIdx}`,
            type: 'story_frame',
            index: frameIdx,
            content: previousResults.imagePrompts?.storyFramePrompts?.[storyIdx]?.[frameIdx] || {},
            imageUrl: url,
            status: 'completed',
            createdAt: now,
          });
        });
      });

      // Reel frames
      genImages.reelFrameUrls?.forEach((reelFrames: string[], reelIdx: number) => {
        reelFrames.forEach((url: string, frameIdx: number) => {
          assets.push({
            assetId: `asset_reel_${reelIdx}_frame_${frameIdx}`,
            type: 'reel_frame',
            index: frameIdx,
            content: previousResults.imagePrompts?.reelFramePrompts?.[reelIdx]?.[frameIdx] || {},
            imageUrl: url,
            status: 'completed',
            createdAt: now,
          });
        });
      });
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

  // ... (prompt builder methods remain the same)
  private buildBusinessUnderstandingPrompt(input: GenerationPipelineInput): string {
    return `SYSTEM RULES:
You are a business analyst for an Indian local marketing AI. Your job is to extract structured, verified facts from a Business Brain document. You must NEVER invent facts. If information is missing, explicitly flag it.

BUSINESS BRAIN DATA:
${JSON.stringify(input.businessBrain, null, 2)}

TASK:
Analyze the Business Brain and output structured JSON with:
1. businessSummary: 2-3 sentence summary for campaign context
2. businessFacts: Array of verified facts with category, fact, source, criticality
3. missingInformation: Critical facts not provided (e.g., "No delivery radius defined", "No opening hours")
4. constraints: Business rules that limit creative freedom (e.g., "Minimum order ₹200", "Delivery only within 5km")
5. verticalContext: Restaurant-specific context (menu structure, service modes, time-parts, occasions, offer types)

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

    return `SYSTEM RULES:
You are a product analyst for restaurant marketing. Extract structured facts from product metadata and images. Distinguish between metadata facts and visual observations. Flag missing critical information.

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
5. marketingAngles: 3-5 angles (e.g., "Authentic Hyderabadi dum process", "Value-for-money portion", "Late-night craving solution")

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildCampaignStrategyPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    return `SYSTEM RULES:
You are a senior marketing strategist for Indian local restaurants. Create a campaign strategy that drives WhatsApp orders. Use ONLY facts from business/product context. Never invent offers, prices, or claims.

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

CAMPAIGN INPUT:
- Objective: ${input.objective}
- Offer: ${input.offerHeadline} - ₹${input.offerPrice} (${input.offerType})
- Audience: ${input.audience.localities.join(', ')} - ${input.audience.occasion || 'general'}
- CTA: ${input.cta}
- Duration: ${input.duration.start} to ${input.duration.end}

TASK:
Create a campaign strategy that:
- Addresses the specific objective
- Frames the offer compellingly for the audience
- Uses regional insights for Hyderabad
- Differentiates from generic marketing
- Drives WhatsApp action

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildLocalizationStrategyPrompt(
    input: GenerationPipelineInput,
    previousResults: any
  ): string {
    return `SYSTEM RULES:
You are a Hyderabadi localization expert. Create marketing language rules — NOT translation rules. The output must enable natural, culturally resonant Telugu-English marketing that sounds like a local recommending to a friend.

LOCALIZATION PROFILE:
${JSON.stringify(input.localizationProfile, null, 2)}

BUSINESS CONTEXT:
${JSON.stringify(previousResults.businessUnderstanding, null, 2)}

CAMPAIGN CONTEXT:
${JSON.stringify(previousResults.campaignStrategy, null, 2)}

TASK:
Generate localization rules for:
1. VOCABULARY: 20+ generic→Hyderabadi mappings (e.g., "delicious"→"dum lagake", "visit"→"aao", "order"→"WhatsApp cheyyandi")
2. PHRASING RULES: 5+ sentence patterns (short, punchy, conversational, question-led)
3. HUMOR STYLE: Self-deprecating, food-obsessed, local pride — with examples
4. CTA PATTERNS: 5+ WhatsApp CTAs ("WhatsApp cheyyandi!", "Order madi!", "Link lo undi")
5. SLANG GUIDE: Approved slang with usage levels and context
6. CULTURAL REFERENCES: Ramzan, Sunday family lunch, Kondapur techies, biryani culture
7. LANGUAGE MIXING: Natural code-switching rules with examples
8. AUDIENCE ADAPTATION: How tone shifts for office workers vs families vs students

CRITICAL: Avoid forced slang, stereotypes, offensive references, unnatural phrasing, excessive slang, fake cultural claims.

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildCopyGenerationPrompt(input: GenerationPipelineInput, previousResults: any): string {
    return `SYSTEM RULES:
You are a Hyderabadi marketing copywriter. Generate a complete campaign pack for a Hyderabad restaurant. Use the localization strategy to write NATURAL Telugu-English-Hinglish copy. Every piece must drive WhatsApp action. Preserve ALL business facts exactly.

CONTEXT HIERARCHY:
1. BUSINESS FACTS (IMMUTABLE): ${JSON.stringify(previousResults.businessUnderstanding?.businessFacts || [], null, 2)}
2. PRODUCT FACTS (IMMUTABLE): ${JSON.stringify(previousResults.productUnderstanding?.productFacts || [], null, 2)}
3. CAMPAIGN STRATEGY: ${JSON.stringify(previousResults.campaignStrategy, null, 2)}
4. LOCALIZATION STRATEGY: ${JSON.stringify(previousResults.localizationStrategy, null, 2)}
5. BRAND TONE: ${input.brandProfile?.brandTone || 'friendly'}
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

MANDATORY REQUIREMENTS:
- Prices: ALWAYS use exact offer price (₹${input.offerPrice})
- Business name: ${input.businessName}
- WhatsApp number: ${input.whatsappNumber}
- Location: ${input.businessLocation?.locality || input.businessLocation?.city}
- Product: ${input.productName}
- NO invented dishes, hours, reviews, guarantees, medical claims
- Language: ${input.localizationProfile?.primaryLanguage} + ${input.localizationProfile?.secondaryLanguage} with ${input.localizationProfile?.languageMixing} mixing
- Regional style: ${input.localizationProfile?.regionalStyle}
- Campaign style: ${input.campaignStyle}

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
    return `SYSTEM RULES:
You are a creative director for Instagram food marketing. Generate detailed, actionable image prompts for AI image generation. Each prompt must produce Instagram-ready vertical images (4:5 for posts, 9:16 for Stories/Reels). Include brand colors, logo placement, and offer text overlays.

NOTE: These prompts are used for ON-DEMAND AI image generation only (max 2/campaign). Primary creative composition uses deterministic templates with business photos.

BRAND VISUAL IDENTITY:
- Primary Color: ${input.brandProfile?.colors?.primary || '#E84D1A'}
- Secondary Color: ${input.brandProfile?.colors?.secondary || '#FFFFFF'}
- Accent Color: ${input.brandProfile?.colors?.accent || '#FFD700'}
- Fonts: Heading=${input.brandProfile?.fonts?.heading || 'Poppins'}, Body=${input.brandProfile?.fonts?.body || 'Inter'}
- Logo: ${input.brandProfile?.logo?.url || ''}
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
- Professional food photography quality
- Indian kitchen/restaurant authenticity
- Brand colors in background/accents
- Offer price prominently displayed
- WhatsApp CTA visible
- Warm, appetizing lighting
- Vertical composition for mobile

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
  }

  private buildTruthValidationPrompt(input: GenerationPipelineInput, previousResults: any): string {
    return `SYSTEM RULES:
You are a fact-checker for restaurant marketing. Verify EVERY claim in the generated campaign against known business facts. Be strict — any invented fact is a violation.

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
1. PRICES: Every price mention must match ₹${input.offerPrice} exactly
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
1. BRAND TONE: Consistent with ${input.brandProfile?.brandTone || 'friendly'} across all assets
2. CHARACTER LIMITS: Instagram caption ≤2200, ad copy limits, headline ≤100
3. CTA PRESENCE: Every asset has clear CTA
4. HASHTAGS: Relevant (Hyderabad, category, offer, locality)
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
  businessName: string;
  businessCategory: string;
  businessLocation: { city: string; state: string; locality?: string };
  whatsappNumber: string;
  businessBrain: any;
  brandProfile: any;

  // Campaign input
  objective: string;
  productId?: string;
  productName: string;
  offerHeadline: string;
  offerDescription?: string;
  offerPrice: number;
  offerOriginalPrice?: number;
  offerType: string;
  offerValidityStart: string;
  offerValidityEnd: string;
  offerTerms?: string;
  duration: { start: string; end: string };
  audience: { localities: string[]; ageRange?: { min: number; max: number }; occasion?: string };
  cta: string;
  localizationProfile: any;
  campaignStyle: string;

  // New product (if applicable)
  newProduct?: {
    name: string;
    description?: string;
    price: number;
    images: string[];
    category: string;
  };
}

export interface GenerationPipelineOutput {
  success: boolean;
  stages: Record<string, any>;
  campaignPack: any;
}