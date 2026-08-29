import OpenAI from 'openai';
import { getEnvConfig } from '../../config/env';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../../types';

const config = getEnvConfig();

/**
 * Image AI Provider using OpenAI DALL-E 3
 * Primary provider for image generation via provider abstraction
 */
export class OpenAIImageProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = config.OPENAI_API_KEY || '';
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate an image using DALL-E 3
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      // Map aspect ratio to DALL-E 3 size
      const size = this.mapAspectRatioToSize(request.aspectRatio);

      // DALL-E 3 doesn't support negative_prompt, so we omit it
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: request.prompt,
        size,
        quality: 'hd',
        n: 1,
        response_format: 'url',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data returned from DALL-E 3');
      }

      const imageData = response.data[0];
      if (!imageData || !imageData.url) {
        throw new Error('No image URL returned from DALL-E 3');
      }

      return {
        success: true,
        imageUrl: imageData.url,
        provider: 'openai',
        model: 'dall-e-3',
        metadata: {
          size,
          quality: 'hd',
          revisedPrompt: imageData.revised_prompt,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        provider: 'openai',
        model: 'dall-e-3',
        error: {
          code: 'IMAGE_GENERATION_FAILED',
          message: `DALL-E 3 generation failed: ${errorMessage}`,
        },
      };
    }
  }

  /**
   * Map aspect ratio to DALL-E 3 supported sizes
   * DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
   */
  private mapAspectRatioToSize(aspectRatio?: string): '1024x1024' | '1024x1792' | '1792x1024' {
    switch (aspectRatio) {
      case '9:16':
        return '1024x1792'; // Portrait (Story/Reel)
      case '16:9':
        return '1792x1024'; // Landscape
      case '4:5':
        return '1024x1792'; // Close to 4:5, use portrait
      case '1:1':
      default:
        return '1024x1024'; // Square
    }
  }
}

// Export singleton instance
export const openAIImageProvider = new OpenAIImageProvider();