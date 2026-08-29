/**
 * AIProvider - Provider-level abstraction
 *
 * Represents an AI provider with its identity and capabilities.
 * The application depends on this abstraction, not concrete providers.
 *
 * This allows the provider to be swapped without rewriting business logic.
 */
export interface AIProvider {
  readonly name: string;
  readonly capabilities: AICapabilities;
  readonly isAvailable: boolean;
  readonly text: TextAI;
  readonly vision: VisionAI;
  readonly image: ImageAI;
}

/**
 * AICapabilities - What the provider can do
 *
 * Separates concerns: TextAI, VisionAI, ImageAI are separate
 * but grouped under the provider's capabilities.
 */
export type AICapabilities = {
  readonly supportsText: boolean;
  readonly supportsVision: boolean;
  readonly supportsImage: boolean;
  readonly supportsEmbedding: boolean;
};

/**
 * Provider status for health checks
 */
export type ProviderStatus = 'online' | 'offline' | 'rate_limited' | 'unavailable';

// Re-export the capability interfaces
import type { TextAI } from '../TextAI';
import type { VisionAI } from '../VisionAI';
import type { ImageAI } from '../ImageAI';
