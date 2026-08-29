/**
 * VisionAI - Image understanding abstraction
 *
 * Future use cases include:
 * - product-photo understanding
 * - food image understanding
 * - brand image understanding
 * - image-to-copy generation
 * - creative analysis
 * - visual context extraction
 *
 * DO NOT build the complete vision pipeline in this phase.
 * Only establish the abstraction.
 */
export interface VisionAI {
  /**
   * Analyze an image and return structured insights.
   *
   * The request/response types are defined by the application's
   * use cases, not hardcoded into this interface.
   */
  analyzeImage(request: VisionAIRequest): Promise<VisionAIResponse>;
}

/**
 * VisionAIRequest - Input for image analysis
 *
 * Structured request that controls what the AI analyzes.
 */
export type VisionAIRequest = {
  readonly imageUrl: string;
  readonly analysisType?: 'product' | 'brand' | 'food' | 'general';
  readonly context?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
};

/**
 * VisionAIResponse - Output from image analysis
 *
 * Structured insights that the application can use.
 */
export type VisionAIResponse = {
  readonly description: string;
  readonly detectedObjects?: readonly string[];
  readonly sentiment?: 'positive' | 'negative' | 'neutral';
  readonly context?: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly model?: string;
};
