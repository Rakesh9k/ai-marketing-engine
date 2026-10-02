import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { getEnvConfig } from '../../config/env';
import { getVerticalConfigOrDefault } from '../../config/verticals';
import { createLogger } from '../../utils/logging';

const logger = createLogger({ function: 'vision' });

/**
 * Runtime contract for the vision analysis response. Previously the parsed
 * JSON.parse() output was returned directly, typed only via the function's
 * declared return type (an unchecked cast) — malformed/partial Gemini
 * output would silently flow into image-prompt building with missing
 * fields instead of failing here where the problem originates.
 */
const VisionAnalysisResultSchema = z.object({
  dishName: z.string(),
  confidence: z.number(),
  visualAttributes: z.object({
    platingStyle: z.string(),
    container: z.string(),
    garnish: z.array(z.string()),
    colorPalette: z.array(z.string()),
    lighting: z.string(),
    background: z.string(),
    portionSize: z.enum(['small', 'medium', 'large', 'family']),
    steamVisible: z.boolean(),
    textureCues: z.array(z.string()),
  }),
  ambianceCues: z.array(z.string()),
  suggestedCompositions: z.array(z.string()),
  qualityFlags: z.array(z.string()),
});

export const ReferenceStyleAnalysisSchema = z.object({
  tone: z.enum(['playful', 'serious', 'professional', 'warm', 'bold', 'premium', 'energetic']),
  visualDensity: z.enum(['minimal', 'low', 'medium', 'high']),
  productProminence: z.enum(['subtle', 'balanced', 'high', 'dominant']),
  textDensity: z.enum(['minimal', 'concise', 'moderate', 'detailed']),
  colorMode: z.enum(['brand', 'neutral', 'monochrome', 'vibrant']),
  humor: z.enum(['none', 'light', 'moderate', 'high']),
  ctaStyle: z.enum(['soft', 'direct', 'urgent', 'conversational']),
  composition: z
    .enum([
      'centered',
      'hero-focused',
      'split-layout',
      'editorial',
      'grid',
      'asymmetric',
      'negative-space-heavy',
      'left-aligned',
      'right-aligned',
    ])
    .optional(),
  visualHierarchy: z
    .array(z.enum(['product', 'headline', 'cta', 'brand', 'supporting-copy']))
    .optional(),
  ctaPlacement: z.enum(['bottom', 'top', 'end-card', 'integrated', 'product-adjacent']).optional(),
  hookStructure: z
    .enum([
      'question',
      'bold-statement',
      'visual-surprise',
      'product-first',
      'problem-first',
      'offer-first',
      'curiosity',
    ])
    .optional(),
  shotPacing: z.enum(['slow', 'moderate', 'fast', 'dynamic', 'cinematic']).optional(),
});
export type ReferenceStyleAnalysisResult = z.infer<typeof ReferenceStyleAnalysisSchema>;

export class GeminiVisionProvider {
  protected get apiKey(): string {
    return getEnvConfig().GEMINI_API_KEY || process.env['GEMINI_API_KEY'] || '';
  }

  protected getModel(): any {
    const key = this.apiKey;
    const client = new GoogleGenerativeAI(key);
    return client.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  /**
   * Analyze reference image for creative style characteristics
   */
  async analyzeReferenceStyle(imageUrl: string): Promise<ReferenceStyleAnalysisResult> {
    const imageParts = await this.prepareImages([imageUrl]);

    const prompt = `You are a professional art director and creative strategist.
Analyze this reference marketing creative. Extract its STYLE characteristics.
Do NOT copy the exact text, exact prices, or exact brand names. We only want the creative style/pattern.

Return a JSON object strictly matching this structure:
{
  "tone": "playful | serious | professional | warm | bold | premium | energetic",
  "visualDensity": "minimal | low | medium | high",
  "productProminence": "subtle | balanced | high | dominant",
  "textDensity": "minimal | concise | moderate | detailed",
  "colorMode": "brand | neutral | monochrome | vibrant",
  "humor": "none | light | moderate | high",
  "ctaStyle": "soft | direct | urgent | conversational",
  "composition": "centered | hero-focused | split-layout | editorial | grid | asymmetric | negative-space-heavy | left-aligned | right-aligned",
  "visualHierarchy": ["product", "headline", "cta", "brand", "supporting-copy"],
  "ctaPlacement": "bottom | top | end-card | integrated | product-adjacent",
  "hookStructure": "question | bold-statement | visual-surprise | product-first | problem-first | offer-first | curiosity",
  "shotPacing": "slow | moderate | fast | dynamic | cinematic"
}
Omit fields if you cannot confidently determine them. Output ONLY JSON.`;

    try {
      const result = await this.getModel().generateContent([prompt, ...imageParts]);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);
      const validation = ReferenceStyleAnalysisSchema.safeParse(parsed);
      if (!validation.success) {
        throw new Error(`Reference style schema validation failed: ${validation.error.message}`);
      }
      return validation.data;
    } catch (error) {
      throw new Error(
        `Reference style analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze product images for marketing campaign
   */
  async analyzeProductImages(
    imageUrls: string[],
    productMetadata: {
      name: string;
      description?: string;
      price: number;
      category: string;
    },
    businessContext: {
      name: string;
      category: string;
      location: { city: string; state: string; locality?: string };
    }
  ): Promise<VisionAnalysisResult> {
    const imageParts = await this.prepareImages(imageUrls);

    // F2/I1: previously, if EVERY image failed to load (expired URL,
    // deleted file, network blip), this silently proceeded to call Gemini
    // with zero images — which still returns a syntactically valid,
    // schema-passing result that the caller had no way to distinguish from
    // a real analysis. It was actually a text-only hallucination based on
    // productMetadata alone. Caller-visible images were requested; caller-
    // visible images must actually have been analyzed, or this must fail
    // loudly (routing into the same refund path as any other pipeline
    // failure) rather than silently degrading.
    if (imageUrls.length > 0 && imageParts.length === 0) {
      throw new Error(
        `Vision analysis failed: none of the ${imageUrls.length} product image(s) could be loaded`
      );
    }

    const prompt = this.buildAnalysisPrompt(productMetadata, businessContext);

    try {
      const result = await this.getModel().generateContent([prompt, ...imageParts]);
      const response = result.response.text();

      return this.parseVisionResponse(response);
    } catch (error) {
      throw new Error(
        `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Prepare images for Gemini API
   */
  protected async prepareImages(imageUrls: string[]): Promise<any[]> {
    const parts = [];
    for (const url of imageUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        parts.push({
          inlineData: {
            mimeType,
            data: base64,
          },
        });
      } catch (error) {
        // Storage URLs carry access tokens/signatures as query params (e.g.
        // Firebase Storage's `?token=...`) — only the path is logged, never
        // the full URL, so a fetch failure log can't leak a live download
        // credential.
        const safePath = (() => {
          try {
            return new URL(url).pathname;
          } catch {
            return '[unparseable-url]';
          }
        })();
        logger.error('Failed to load image for vision analysis', error, { path: safePath });
      }
    }
    return parts;
  }

  /**
   * Build the analysis prompt for product images
   */
  private buildAnalysisPrompt(
    productMetadata: {
      name: string;
      description?: string;
      price: number;
      category: string;
    },
    businessContext: {
      name: string;
      category: string;
      location: { city: string; state: string; locality?: string };
    }
  ): string {
    const verticalPrefix = getVerticalConfigOrDefault(businessContext.category).promptContext
      .imageAnalystPersona;

    return `${verticalPrefix}

BUSINESS CONTEXT:
- Business: ${businessContext.name}
- Category: ${businessContext.category}
- Location: ${businessContext.location.city}, ${businessContext.location.state}${businessContext.location.locality ? ` (${businessContext.location.locality})` : ''}

PRODUCT METADATA:
- Name: ${productMetadata.name}
- Description: ${productMetadata.description || 'Not provided'}
- Category: ${productMetadata.category}
- Price: ₹${productMetadata.price}

ANALYSIS REQUIRED:
Return a JSON object with the following structure:

{
  "dishName": "string - Identified dish name from images",
  "confidence": "number - Confidence score 0-1",
  "visualAttributes": {
    "platingStyle": "string - e.g., copper handi, banana leaf, white plate, bowl",
    "container": "string - Type of container",
    "garnish": ["string - Array of visible garnishes"],
    "colorPalette": ["string - Dominant colors"],
    "lighting": "string - natural/warm/studio/dim",
    "background": "string - kitchen/table/blurred/clean",
    "portionSize": "small|medium|large|family",
    "steamVisible": "boolean",
    "textureCues": ["string - e.g., crispy, juicy, creamy, fluffy"]
  },
  "ambianceCues": ["string - Environmental cues like restaurant setting, lighting mood"],
  "suggestedCompositions": ["string - 3-5 suggested photo compositions for marketing"],
  "qualityFlags": ["string - Issues like blur, overexposure, clutter, bad angle"]
}

Be specific and descriptive for image prompt generation. Focus on visual details that would help create appetizing marketing creatives.`;
  }

  /**
   * Parse the vision response from Gemini
   */
  private parseVisionResponse(response: string): VisionAnalysisResult {
    // Extract JSON from response (Gemini might include markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(
        `Failed to parse vision response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }

    const result = VisionAnalysisResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Vision response schema validation failed: ${result.error.message}`);
    }
    return result.data;
  }
}

export type VisionAnalysisResult = z.infer<typeof VisionAnalysisResultSchema>;

const ReelClipClassificationSchema = z.object({
  classifications: z.array(
    z.object({
      clipId: z.string(),
      sceneType: z.enum([
        'food',
        'preparation',
        'cooking',
        'chef',
        'interior',
        'customer',
        'product',
        'unknown',
      ]),
      relevanceScore: z.number().min(0).max(1),
      description: z.string(),
    })
  ),
});

export type ReelClipClassificationResult = z.infer<typeof ReelClipClassificationSchema>;

/**
 * Scene classification for "Create a Reel" clip thumbnails. Deliberately a
 * SINGLE batched Gemini call for up to 10 thumbnails (one prompt, all
 * images attached) rather than one call per clip — see AGENTS.md section 38
 * "COST CONTROL" ("one clip-analysis batch where possible").
 */
export class GeminiReelVisionProvider extends GeminiVisionProvider {
  async classifyReelClipThumbnails(
    clips: Array<{ clipId: string; thumbnailUrl: string }>,
    businessContext: { name: string; category: string; goal: string }
  ): Promise<ReelClipClassificationResult> {
    const imageParts = await this.prepareImages(clips.map((c) => c.thumbnailUrl));

    const prompt = `You are Mitra's short-form social video editor. You will see ${clips.length} still thumbnails, each extracted from one raw video clip a local business owner uploaded, in this order: ${clips
      .map((c, i) => `${i + 1}. clipId="${c.clipId}"`)
      .join(', ')}.

Business: ${businessContext.name} (${businessContext.category}). Reel goal: ${businessContext.goal}.

For EACH thumbnail, in the same order, classify what it shows and how strong a moment it is for a vertical Instagram Reel.

Return JSON:
{
  "classifications": [
    {
      "clipId": "string - must exactly match one of the given clipIds, one entry per thumbnail",
      "sceneType": "food|preparation|cooking|chef|interior|customer|product|unknown",
      "relevanceScore": "number 0-1 - how strong/usable this moment is (clear, well-lit, interesting > blurry, dark, empty)",
      "description": "short phrase describing what's visible, max 12 words"
    }
  ]
}`;

    const result = await this.getModel().generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    const validated = ReelClipClassificationSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `Reel clip classification schema validation failed: ${validated.error.message}`
      );
    }
    return validated.data;
  }
}

// Export singleton instances
export const geminiVisionProvider = new GeminiVisionProvider();
export const geminiReelVisionProvider = new GeminiReelVisionProvider();
