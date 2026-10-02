import type { BackgroundRemovalRequest, BackgroundRemovalResult } from '../../interfaces';
import { notConfiguredError } from '../../providerErrors';

/**
 * Placeholder background-removal provider for Photoroom. NOT YET CONFIGURED
 * — no Photoroom credentials exist in this project. Never pretend this
 * works: always throw, never return a fake successful result. See
 * docs/AI_ARCHITECTURE.md.
 */
export class PhotoroomProvider {
  async removeBackground(_request: BackgroundRemovalRequest): Promise<BackgroundRemovalResult> {
    throw notConfiguredError('photoroom', 'removeBackground');
  }
}

export const photoroomProvider = new PhotoroomProvider();
