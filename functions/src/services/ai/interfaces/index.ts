import type { z } from 'zod';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../../../types';
import type {
  VisionAnalysisResult,
  ReelClipClassificationResult,
  ReferenceStyleAnalysisResult,
} from '../vision';
import type { VideoRenderer as Renderer } from '../../videoRenderer';

/**
 * Mitra AI provider contracts (Phase 0).
 *
 * These interfaces describe Mitra CAPABILITIES (what business logic needs),
 * not vendor APIs — business logic and Cloud Functions must depend on these,
 * never on a concrete provider (GoogleGenerativeAI, a REST client, etc.)
 * directly. See docs/AI_ARCHITECTURE.md for the provider mapping and status
 * of each capability (architected vs. implemented vs. configured).
 *
 * Method shapes intentionally match the existing, working Gemini providers
 * (text.ts/vision.ts/image.ts) rather than inventing a new contract that
 * would force every pipeline.ts call site to be rewritten.
 */

export interface TextAI {
  generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number; model?: string }
  ): Promise<T>;
}

export interface VisionAI {
  analyzeProductImages(
    imageUrls: string[],
    productMetadata: { name: string; description?: string; price: number; category: string },
    businessContext: {
      name: string;
      category: string;
      location: { city: string; state: string; locality?: string };
    }
  ): Promise<VisionAnalysisResult>;
  analyzeReferenceStyle(imageUrl: string): Promise<ReferenceStyleAnalysisResult>;
}

/** Batched scene classification for "Create a Reel" clip thumbnails. */
export interface ReelVisionAI extends VisionAI {
  classifyReelClipThumbnails(
    clips: Array<{ clipId: string; thumbnailUrl: string }>,
    businessContext: { name: string; category: string; goal: string }
  ): Promise<ReelClipClassificationResult>;
}

export interface BackgroundRemovalRequest {
  readonly sourceImageUrl: string;
}

export interface BackgroundRemovalResult {
  readonly success: boolean;
  readonly imageData?: { readonly base64: string; readonly mimeType: string };
  readonly error?: { readonly code: string; readonly message: string };
}

export interface ImageAI {
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  /** Not every ImageAI provider supports background removal (e.g. Gemini doesn't) — optional by design. */
  removeBackground?(request: BackgroundRemovalRequest): Promise<BackgroundRemovalResult>;
}

export interface VideoGenerationRequest {
  readonly prompt: string;
  readonly durationSeconds?: number;
  readonly aspectRatio?: '9:16' | '16:9' | '1:1';
  readonly sourceImageUrl?: string;
}

export interface VideoGenerationResult {
  readonly success: boolean;
  readonly videoUrl?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly error?: { readonly code: string; readonly message: string };
}

/** AI-generated video (e.g. Veo). Distinct from the deterministic ffmpeg Reel {@link Renderer}. */
export interface VideoAI {
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
}

export interface AudioGenerationRequest {
  readonly text: string;
  readonly voiceId?: string;
  readonly languageCode?: string;
}

export interface AudioGenerationResult {
  readonly success: boolean;
  readonly audioUrl?: string;
  readonly audioData?: { readonly base64: string; readonly mimeType: string };
  readonly provider?: string;
  readonly error?: { readonly code: string; readonly message: string };
}

/** AI-generated voiceover/audio (e.g. ElevenLabs). Not used for the static Reel music library. */
export interface AudioAI {
  generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResult>;
}

/**
 * Deterministic rendering (Mitra's own ffmpeg-based Cloud Run service today,
 * a future Creatomate fallback later). Re-exported here so the AI-capability
 * mapping is discoverable from one place — the real interface and its
 * implementations (CloudRunVideoRenderer = "MitraRenderer", DevMockVideoRenderer)
 * live in services/videoRenderer.ts and are unchanged by Phase 0.
 */
export type { Renderer };
