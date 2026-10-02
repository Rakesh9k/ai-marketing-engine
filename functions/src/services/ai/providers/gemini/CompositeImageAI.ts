import type { ImageGenerationRequest, ImageGenerationResponse } from '../../../../types';
import type { GeminiImageProvider } from '../../image';
import type { PhotoroomProvider } from '../photoroom/PhotoroomProvider';
import type { BackgroundRemovalRequest, BackgroundRemovalResult, ImageAI } from '../../interfaces';

/**
 * Composite ImageAI: image generation is delegated to Gemini (implemented,
 * configured), background removal to Photoroom (architected, not yet
 * configured — throws until real credentials exist). Kept as a thin
 * delegator rather than merging the two vendor implementations into one
 * class, so each provider stays independently swappable.
 */
export class CompositeImageAI implements ImageAI {
  constructor(
    private readonly imageProvider: GeminiImageProvider,
    private readonly backgroundRemovalProvider: PhotoroomProvider
  ) {}

  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return this.imageProvider.generateImage(request);
  }

  removeBackground(request: BackgroundRemovalRequest): Promise<BackgroundRemovalResult> {
    return this.backgroundRemovalProvider.removeBackground(request);
  }
}
