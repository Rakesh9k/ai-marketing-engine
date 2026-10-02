import type { AudioAI, AudioGenerationRequest, AudioGenerationResult } from '../../interfaces';
import { notConfiguredError } from '../../providerErrors';

/**
 * Placeholder AudioAI provider for ElevenLabs. NOT YET CONFIGURED — no
 * ElevenLabs credentials exist in this project. Never pretend this works:
 * always throw, never return a fake successful result. See
 * docs/AI_ARCHITECTURE.md.
 */
export class ElevenLabsProvider implements AudioAI {
  async generateAudio(_request: AudioGenerationRequest): Promise<AudioGenerationResult> {
    throw notConfiguredError('elevenlabs', 'generateAudio');
  }
}

export const elevenLabsProvider = new ElevenLabsProvider();
