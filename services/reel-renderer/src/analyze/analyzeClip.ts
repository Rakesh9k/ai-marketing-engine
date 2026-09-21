import * as path from 'path';
import { withTempDir } from '../lib/tempDir';
import { downloadToFile, uploadFile, thumbnailPathFor, localFileNameFor } from '../lib/storage';
import { probeVideo } from '../lib/probe';
import { extractThumbnail } from '../lib/thumbnail';
import { computeHeuristics } from '../lib/heuristics';
import { MAX_CLIP_DURATION_MS } from '../config';
import { ApiError, ClipAnalysisInput, ClipAnalysisOutput } from '../types';
import { createLogger } from '../lib/logger';

const logger = createLogger('analyzeClip');

export async function analyzeClip(input: ClipAnalysisInput): Promise<ClipAnalysisOutput> {
  if (!input.clipId || !input.storagePath) {
    throw new ApiError(400, 'invalid_request', 'clipId and storagePath are required');
  }

  return withTempDir('analyze', async (dir) => {
    const inputLocal = path.join(dir, localFileNameFor(input.storagePath));
    const thumbLocal = path.join(dir, 'thumb.jpg');

    await downloadToFile(input.storagePath, inputLocal);

    const probe = await probeVideo(inputLocal);

    if (probe.durationMs > MAX_CLIP_DURATION_MS * 2) {
      // Advisory only — real enforcement already happened upstream at
      // upload time. We log loudly but still render a best-effort result
      // rather than hard-failing the whole analyze pipeline over it.
      logger.warn('clip duration far exceeds MAX_CLIP_DURATION_MS', {
        clipId: input.clipId,
        durationMs: probe.durationMs,
        capMs: MAX_CLIP_DURATION_MS,
      });
    }

    await extractThumbnail(inputLocal, thumbLocal, probe.durationMs);
    const { brightnessScore, motionScore } = await computeHeuristics(inputLocal, probe.durationMs);

    const thumbnailStoragePath = thumbnailPathFor(input.storagePath);
    await uploadFile(thumbLocal, thumbnailStoragePath, 'image/jpeg');

    const result: ClipAnalysisOutput = {
      clipId: input.clipId,
      durationMs: probe.durationMs,
      width: probe.width,
      height: probe.height,
      thumbnailStoragePath,
      brightnessScore,
      motionScore,
    };
    logger.info('analyzeClip complete', result);
    return result;
  });
}
