/**
 * Shared error shape for AI provider placeholders (Veo, ElevenLabs,
 * Photoroom) that are architected but not yet configured. Existing Gemini
 * providers keep their own established error classes (text.ts/vision.ts
 * throw plain Errors, image.ts has ImageProviderError) — those are already
 * safe (never expose API keys/headers) and are left untouched per Phase 0's
 * "preserve existing working error handling" rule.
 */
export class AIProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly operation: string,
    message: string,
    readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export function notConfiguredError(provider: string, operation: string): AIProviderError {
  return new AIProviderError(
    provider,
    operation,
    `${provider} is not configured yet. This capability is architected (see docs/AI_ARCHITECTURE.md) but not implemented.`,
    false
  );
}
