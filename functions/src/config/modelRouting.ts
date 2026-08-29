/**
 * Model Routing Configuration
 *
 * Centralized configuration for AI model selection per pipeline stage.
 * Models are selected by capability, not vendor.
 * Actual model names are resolved at runtime via provider configuration.
 */

export interface ModelRoutingConfig {
  textPrimary: string;
  textFallback: string;
  visionPrimary: string;
  visionFallback: string;
  imagePrimary: string;
  imageFallback: string;
  embeddingPrimary: string;
  embeddingFallback: string;
}

export const MODEL_ROUTING_CONFIG: ModelRoutingConfig = {
  textPrimary: process.env['TEXT_MODEL_PRIMARY'] || 'gemini-1.5-pro',
  textFallback: process.env['TEXT_MODEL_FALLBACK'] || 'gemini-1.5-pro',
  visionPrimary: process.env['VISION_MODEL_PRIMARY'] || 'gemini-1.5-pro',
  visionFallback: process.env['VISION_MODEL_FALLBACK'] || 'gemini-1.5-pro',
  imagePrimary: process.env['IMAGE_MODEL_PRIMARY'] || 'dall-e-3',
  imageFallback: process.env['IMAGE_MODEL_FALLBACK'] || 'gemini-imagen',
  embeddingPrimary: process.env['EMBEDDING_MODEL_PRIMARY'] || 'text-embedding-3-small',
  embeddingFallback: process.env['EMBEDDING_MODEL_FALLBACK'] || 'gemini-embedding',
};

export const STAGE_MODEL_MAP = {
  // Text Stages
  businessUnderstanding: { primary: 'textPrimary', fallback: 'textFallback' },
  campaignStrategy: { primary: 'textPrimary', fallback: 'textFallback' },
  localizationStrategy: { primary: 'textPrimary', fallback: 'textFallback' },
  copyGeneration: { primary: 'textPrimary', fallback: 'textFallback' },
  creativeDirection: { primary: 'textPrimary', fallback: 'textFallback' },
  imagePromptGeneration: { primary: 'textPrimary', fallback: 'textFallback' },
  truthValidation: { primary: 'textPrimary', fallback: 'textFallback' },
  qualityValidation: { primary: 'textPrimary', fallback: 'textFallback' },
  safetyValidation: { primary: 'textPrimary', fallback: 'textFallback' },
  whatsappGeneration: { primary: 'textPrimary', fallback: 'textFallback' },

  // Vision Stage
  productImageAnalysis: { primary: 'visionPrimary', fallback: 'visionFallback' },

  // Image Generation (via provider abstraction)
  imageGeneration: { primary: 'imagePrimary', fallback: 'imageFallback' },

  // Embeddings (Post-MVP)
  embeddings: { primary: 'embeddingPrimary', fallback: 'embeddingFallback' },
} as const;

export type StageName = keyof typeof STAGE_MODEL_MAP;

/**
 * Get the model configuration for a specific pipeline stage
 */
export function getStageModelConfig(stage: StageName): { primary: string; fallback: string } {
  return STAGE_MODEL_MAP[stage];
}

/**
 * Get the actual model name from routing config
 */
export function resolveModelName(configKey: keyof ModelRoutingConfig): string {
  return MODEL_ROUTING_CONFIG[configKey];
}
