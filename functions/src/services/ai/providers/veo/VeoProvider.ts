import type { VideoAI, VideoGenerationRequest, VideoGenerationResult } from '../../interfaces';
import { notConfiguredError } from '../../providerErrors';

/**
 * Placeholder VideoAI provider for Google Veo. NOT YET CONFIGURED — no Veo
 * credentials/SDK exist in this project. Never pretend this works: always
 * throw, never return a fake successful result. See docs/AI_ARCHITECTURE.md.
 */
export class VeoProvider implements VideoAI {
  async generateVideo(_request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    throw notConfiguredError('veo', 'generateVideo');
  }
}

export const veoProvider = new VeoProvider();
