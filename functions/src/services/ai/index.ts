import { geminiVisionProvider } from './vision';
import { geminiTextProvider } from './text';
import { openAIImageProvider } from './image';
import { runDeterministicTruthCheck, extractFacts } from './truthCheck';
import type { VisionAnalysisResult } from './vision';
import type { ImageGenerationRequest, ImageGenerationResponse, GenerationPipelineInput, TruthCheckResult } from '../../types';

/**
 * AI Services Registry
 * Centralized access to all AI providers
 */
export const aiServices = {
  vision: geminiVisionProvider,
  text: geminiTextProvider,
  image: openAIImageProvider,
  truthCheck: {
    runDeterministicTruthCheck,
    extractFacts,
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
  return aiServices.vision.analyzeProductImages(imageUrls, productMetadata, businessContext);
}

/**
 * Generate structured text using the text provider
 */
export async function generateStructuredText<T>(
  prompt: string,
  schema: any,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  return aiServices.text.generateStructured<T>(schema, { temperature: 0.4, maxTokens: 8192 });
}

/**
 * Generate free-form text
 */
export async function generateText(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return aiServices.text.generateText(prompt, options);
}

/**
 * Generate image using the image provider
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  return aiServices.image.generateImage(request);
}