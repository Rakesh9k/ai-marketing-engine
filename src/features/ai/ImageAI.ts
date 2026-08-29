/**
 * ImageAI - Image generation/transformation abstraction
 *
 * Provider-neutral interface for AI image generation.
 * All provider-specific logic lives in provider adapters.
 */
export interface ImageAI {
  /**
   * Generate an image based on a structured request.
   *
   * @param request - Structured image generation request
   * @returns Image generation response with URL and metadata
   */
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
}

/**
 * ImageGenerationRequest - Input for image generation
 *
 * Provider-neutral request structure. All provider-specific
 * parameters are mapped in the adapter layer.
 */
export type ImageGenerationRequest = {
  /** Main prompt describing the desired image */
  readonly prompt: string;
  /** Negative prompt - what to avoid in the image */
  readonly negativePrompt?: string;
  /** Optional source image URL for image-to-image/edit workflows */
  readonly sourceImageUrl?: string;
  /** Aspect ratio for the generated image */
  readonly aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  /** Explicit width (alternative to aspectRatio) */
  readonly width?: number;
  /** Explicit height (alternative to aspectRatio) */
  readonly height?: number;
  /** Generation mode determines prompt optimization strategy */
  readonly generationMode: 'product_ad' | 'social_post' | 'story' | 'campaign_creative';
  /** Brand context for consistent visual identity */
  readonly brandContext?: {
    readonly colors?: readonly string[];
    readonly style?: string;
    readonly logoUrl?: string;
  };
  /** Additional metadata for tracking/debugging */
  readonly metadata?: Record<string, unknown>;
};

/**
 * ImageGenerationResponse - Output from image generation
 *
 * Standardized response across all providers.
 */
export type ImageGenerationResponse = {
  /** Whether generation succeeded */
  readonly success: boolean;
  /** Download URL for the generated image (if successful) */
  readonly imageUrl?: string;
  /** Provider identifier (e.g., 'openai', 'google') */
  readonly provider?: string;
  /** Model identifier (e.g., 'dall-e-3', 'imagen-3') */
  readonly model?: string;
  /** Additional metadata from provider */
  readonly metadata?: Record<string, unknown>;
  /** Error details (if failed) */
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
};

/**
 * ImageValidationResult - Result of post-generation validation
 */
export type ImageValidationResult = {
  /** Whether validation passed */
  readonly passed: boolean;
  /** Validation checks performed */
  readonly checks: {
    readonly generationSucceeded: boolean;
    readonly imageExists: boolean;
    readonly validUrl: boolean;
    readonly validMimeType: boolean;
    readonly acceptableDimensions: boolean;
    readonly reasonableFileSize: boolean;
    readonly providerOutputUsable: boolean;
    readonly productConsistent?: boolean;
    readonly noProhibitedContent?: boolean;
    readonly noUnexpectedBusinessIdentity?: boolean;
  };
  /** Any validation warnings */
  readonly warnings?: readonly string[];
  /** Validation errors */
  readonly errors?: readonly string[];
};
