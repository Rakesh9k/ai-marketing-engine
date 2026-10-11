/**
 * PHASE 18 — Platform Validator
 * Validates social platform technical constraints (aspect ratio, duration, dimensions, file size).
 */

import type { ValidationGateResult } from '../types/execution.types';

export class PlatformValidator {
  /**
   * Validates platform constraints for post images or reel videos.
   */
  public validatePlatformConstraints(
    aspectRatio: string,
    width: number,
    height: number,
    durationMs?: number,
    fileSizeBytes?: number
  ): ValidationGateResult {
    const details: string[] = [];

    // Aspect ratio check
    const supportedRatios = ['1:1', '4:5', '9:16', '16:9'];
    if (!supportedRatios.includes(aspectRatio)) {
      details.push(`Platform Error: Unsupported aspect ratio '${aspectRatio}'.`);
    }

    // Dimension check for Instagram / Meta
    if (width < 600 || height < 600) {
      details.push(`Platform Error: Image dimensions (${width}x${height}) below minimum platform standard (600x600).`);
    }

    // Duration check for Reels / Video
    if (durationMs !== undefined) {
      if (durationMs > 90000) {
        details.push(`Platform Error: Video duration (${Math.round(durationMs / 1000)}s) exceeds maximum 90s platform limit for reels.`);
      }
    }

    // File size check (15MB for images, 100MB for video)
    if (fileSizeBytes) {
      const maxMb = durationMs !== undefined ? 100 : 15;
      if (fileSizeBytes > maxMb * 1024 * 1024) {
        details.push(`Platform Error: File size exceeds ${maxMb}MB limit.`);
      }
    }

    const passed = details.length === 0;

    return {
      gateName: 'Platform Compliance Check',
      passed,
      score: passed ? 100 : 0,
      details: passed ? [`Platform compliance verified for ratio '${aspectRatio}'.`] : details,
      blocking: true,
    };
  }
}
