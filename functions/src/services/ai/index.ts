import type { z } from 'zod';
import { geminiVisionProvider, geminiReelVisionProvider } from './vision';
import { geminiTextProvider } from './text';
import { openAIImageProvider } from './image';
import { runDeterministicTruthCheck, extractFacts } from './truthCheck';
import { executeWithUsageControl, getGenerationCost, USAGE_ERROR_CODES } from '../usageControl';
import { withTimeout, withRetry } from './retry';
import { createLogger } from '../../utils/logging';
import type { VisionAnalysisResult, ReelClipClassificationResult } from './vision';
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  GenerationPipelineInput,
  TruthCheckResult,
} from '../../types';

const aiLogger = createLogger({ component: 'ai-provider' });

// Bounded per-call timeouts. None existed before this fix — a hung provider
// call could previously block a generation indefinitely.
const TEXT_TIMEOUT_MS = 30_000;
const VISION_TIMEOUT_MS = 45_000;
const IMAGE_TIMEOUT_MS = 60_000;

/**
 * AI Services Registry
 * Centralized access to all AI providers
 */
export const aiServices = {
  vision: geminiVisionProvider,
  reelVision: geminiReelVisionProvider,
  text: geminiTextProvider,
  image: openAIImageProvider,
  truthCheck: {
    runDeterministicTruthCheck,
    extractFacts,
  },
  usageControl: {
    executeWithUsageControl,
    getGenerationCost,
    USAGE_ERROR_CODES,
  },
};

/**
 * Generate product analysis from images using Vision AI
 */
export async function analyzeProductImages(
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
  const start = Date.now();
  const meta = {
    provider: 'gemini',
    model: 'gemini-flash-latest',
    stage: 'vision.analyzeProductImages',
    imageCount: imageUrls.length,
  };
  try {
    const result = await withRetry(
      () =>
        withTimeout(
          aiServices.vision.analyzeProductImages(imageUrls, productMetadata, businessContext),
          VISION_TIMEOUT_MS,
          'vision.analyzeProductImages'
        ),
      {
        onRetry: (attempt, error) =>
          aiLogger.warn('ai.retry', { ...meta, attempt, error: errorMessage(error) }),
      }
    );
    aiLogger.info('ai.success', { ...meta, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    aiLogger.error('ai.failed', error, { ...meta, durationMs: Date.now() - start });
    throw error;
  }
}

/**
 * Batched scene classification for "Create a Reel" clip thumbnails (see
 * GeminiReelVisionProvider.classifyReelClipThumbnails) — one Gemini call for
 * up to MAX_REEL_CLIPS thumbnails, not one call per clip.
 */
export async function classifyReelClipThumbnails(
  clips: Array<{ clipId: string; thumbnailUrl: string }>,
  businessContext: { name: string; category: string; goal: string }
): Promise<ReelClipClassificationResult> {
  const start = Date.now();
  const meta = {
    provider: 'gemini',
    model: 'gemini-flash-latest',
    stage: 'reelVision.classifyReelClipThumbnails',
    clipCount: clips.length,
  };
  try {
    const result = await withRetry(
      () =>
        withTimeout(
          aiServices.reelVision.classifyReelClipThumbnails(clips, businessContext),
          VISION_TIMEOUT_MS,
          'reelVision.classifyReelClipThumbnails'
        ),
      {
        onRetry: (attempt, error) =>
          aiLogger.warn('ai.retry', { ...meta, attempt, error: errorMessage(error) }),
      }
    );
    aiLogger.info('ai.success', { ...meta, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    aiLogger.error('ai.failed', error, { ...meta, durationMs: Date.now() - start });
    throw error;
  }
}

/**
 * Generate structured text using the text provider.
 *
 * The prompt and schema must both reach the provider as distinct arguments —
 * this previously called aiServices.text.generateStructured(schema, options),
 * silently dropping the prompt and passing the schema in the prompt's
 * position. Every structured-text call in the pipeline was affected.
 */
export async function generateStructuredText<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const start = Date.now();
  const meta = {
    provider: 'gemini',
    model: 'gemini-flash-latest',
    stage: 'text.generateStructured',
    promptLength: prompt.length,
  };
  try {
    const result = await withRetry(
      () =>
        withTimeout(
          aiServices.text.generateStructured<T>(prompt, schema, options),
          TEXT_TIMEOUT_MS,
          'text.generateStructured'
        ),
      {
        onRetry: (attempt, error) =>
          aiLogger.warn('ai.retry', { ...meta, attempt, error: errorMessage(error) }),
      }
    );
    aiLogger.info('ai.success', { ...meta, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    aiLogger.error('ai.failed', error, { ...meta, durationMs: Date.now() - start });
    throw error;
  }
}

/**
 * Generate free-form text
 */
export async function generateText(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const start = Date.now();
  const meta = {
    provider: 'gemini',
    model: 'gemini-flash-latest',
    stage: 'text.generateText',
    promptLength: prompt.length,
  };
  try {
    const result = await withRetry(
      () =>
        withTimeout(
          aiServices.text.generateText(prompt, options),
          TEXT_TIMEOUT_MS,
          'text.generateText'
        ),
      {
        onRetry: (attempt, error) =>
          aiLogger.warn('ai.retry', { ...meta, attempt, error: errorMessage(error) }),
      }
    );
    aiLogger.info('ai.success', { ...meta, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    aiLogger.error('ai.failed', error, { ...meta, durationMs: Date.now() - start });
    throw error;
  }
}

/**
 * Generate image using the image provider.
 *
 * Unlike the text/vision paths, generateImage's existing contract never
 * throws — it always resolves with { success, error? }. A timeout is
 * translated into that same shape rather than thrown, so callers don't need
 * two different failure-handling paths. No automatic retry here: image
 * generation is the most expensive call per campaign, and pipeline.ts
 * already falls back to a placeholder on failure — adding retries here
 * would multiply cost without a corresponding requirement to fix a pipeline
 * blocker (see Phase 5 cost-control constraint).
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const start = Date.now();
  const meta = { provider: 'openai', model: 'dall-e-3', stage: 'image.generateImage' };
  try {
    const result = await withTimeout(
      aiServices.image.generateImage(request),
      IMAGE_TIMEOUT_MS,
      'image.generateImage'
    );
    if (result.success) {
      aiLogger.info('ai.success', { ...meta, durationMs: Date.now() - start });
    } else {
      aiLogger.warn('ai.failed', {
        ...meta,
        durationMs: Date.now() - start,
        error: result.error?.message,
      });
    }
    return result;
  } catch (error) {
    aiLogger.error('ai.timeout', error, { ...meta, durationMs: Date.now() - start });
    return {
      success: false,
      provider: 'openai',
      model: 'dall-e-3',
      error: { code: 'TIMEOUT', message: errorMessage(error) },
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
