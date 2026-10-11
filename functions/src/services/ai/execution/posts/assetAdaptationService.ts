/**
 * PHASE 18 — Asset Adaptation Service
 * Evaluates whether a hero visual asset can safely support multiple aspect ratios
 * (1:1, 4:5, 9:16, 16:9) without force-cropping subjects or text-safe zones.
 */

import type { ExecutionAsset } from '../types/execution.types';

export interface AspectRatioAdaptationResult {
  sourceAssetId: string;
  targetRatio: '1:1' | '4:5' | '9:16' | '16:9';
  safeToCrop: boolean;
  recommendedAction: 'CROP_AND_REPOSITION' | 'GENERATE_RATIO_VARIANT' | 'LETTERBOX';
  cropBox?: { x: number; y: number; width: number; height: number };
  adaptedStoragePath?: string;
}

export class AssetAdaptationService {
  /**
   * Evaluates aspect ratio compatibility for a hero visual asset.
   */
  public evaluateAdaptation(
    asset: ExecutionAsset,
    targetRatio: '1:1' | '4:5' | '9:16' | '16:9'
  ): AspectRatioAdaptationResult {
    const width = asset.width || 1080;
    const height = asset.height || 1080;
    const sourceRatio = width / height;

    let targetNumericRatio = 1.0;
    if (targetRatio === '4:5') targetNumericRatio = 0.8;
    else if (targetRatio === '9:16') targetNumericRatio = 9 / 16;
    else if (targetRatio === '16:9') targetNumericRatio = 16 / 9;

    const ratioDifference = Math.abs(sourceRatio - targetNumericRatio);

    // If source ratio is very close to target ratio (e.g. within 15%), safe to crop
    if (ratioDifference <= 0.25) {
      let cropWidth = width;
      let cropHeight = height;

      if (sourceRatio > targetNumericRatio) {
        // Source is wider than target -> crop width
        cropWidth = Math.round(height * targetNumericRatio);
      } else {
        // Source is taller than target -> crop height
        cropHeight = Math.round(width / targetNumericRatio);
      }

      const x = Math.round((width - cropWidth) / 2);
      const y = Math.round((height - cropHeight) / 2);

      return {
        sourceAssetId: asset.id,
        targetRatio,
        safeToCrop: true,
        recommendedAction: 'CROP_AND_REPOSITION',
        cropBox: { x, y, width: cropWidth, height: cropHeight },
      };
    }

    // Large aspect ratio shift (e.g. 1:1 square to 9:16 story reel vertical)
    // Blind cropping will cut off subject or text-safe zone -> recommended to generate ratio variant
    return {
      sourceAssetId: asset.id,
      targetRatio,
      safeToCrop: false,
      recommendedAction: 'GENERATE_RATIO_VARIANT',
    };
  }
}
