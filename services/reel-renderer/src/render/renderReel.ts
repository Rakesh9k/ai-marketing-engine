import * as path from 'path';
import { withTempDir } from '../lib/tempDir';
import { downloadToFile, uploadFile, localFileNameFor } from '../lib/storage';
import { probeVideo } from '../lib/probe';
import { extractThumbnail } from '../lib/thumbnail';
import { buildSegmentClip } from './segmentBuilder';
import { buildTextCardClip } from './textCard';
import { concatWithTransitions, ConcatClip } from './concat';
import { overlayLogo } from './logoOverlay';
import { mixMusicAndExport } from './audioMix';
import { DEFAULT_JOIN_TRANSITION } from './constants';
import { ApiError, ReelRenderInput, RenderedReel } from '../types';
import { MAX_REEL_CLIPS } from '../config';
import { createLogger } from '../lib/logger';

const logger = createLogger('renderReel');

/**
 * End-to-end "raw clips -> postable vertical Reel" pipeline. Deliberate
 * simplification for this MVP: every intermediate segment/title-card clip
 * is built WITHOUT audio (`-an`), and the only audio in the final output is
 * the background music bed mixed in at the very end (see audioMix.ts).
 * This sidesteps a much harder problem (crossfading/ducking N clips' own
 * audio tracks against each other and against music) in favor of a single
 * reliable audio path, which the product brief explicitly allows: "If a
 * clip's original audio is very quiet/silent, that's fine — the music still
 * carries the piece."
 */
export async function renderReel(input: ReelRenderInput): Promise<RenderedReel> {
  validateInput(input);

  return withTempDir('render', async (dir) => {
    const clipsDir = path.join(dir, 'clips');
    const segmentsDir = path.join(dir, 'segments');
    await Promise.all([mkdir(clipsDir), mkdir(segmentsDir)]);

    // 1. Download all referenced source clips.
    const clipLocalPaths = new Map<string, string>();
    for (const clip of input.clips) {
      const local = path.join(clipsDir, `${clip.clipId}-${localFileNameFor(clip.storagePath)}`);
      await downloadToFile(clip.storagePath, local);
      clipLocalPaths.set(clip.clipId, local);
    }

    // 2. Download music + optional logo.
    const musicExt = path.extname(input.music.storagePath) || '.mp3';
    const musicLocal = path.join(dir, `music${musicExt}`);
    await downloadToFile(input.music.storagePath, musicLocal);

    let logoLocal: string | undefined;
    if (input.brand.logoStoragePath) {
      logoLocal = path.join(dir, 'logo' + path.extname(input.brand.logoStoragePath));
      await downloadToFile(input.brand.logoStoragePath, logoLocal);
    }

    // 3. Build the ordered list of normalized silent clips: hook, each main
    // segment, optional offer, ending.
    const orderedClips: ConcatClip[] = [];

    const hookPath = path.join(segmentsDir, 'hook.mp4');
    await buildTextCardClip({
      text: input.plan.hook.text,
      durationMs: input.plan.hook.durationMs,
      outputPath: hookPath,
      workDir: segmentsDir,
      primaryColor: input.brand.primaryColor,
    });
    orderedClips.push({ path: hookPath, transitionIn: DEFAULT_JOIN_TRANSITION });

    for (let i = 0; i < input.plan.segments.length; i++) {
      const seg = input.plan.segments[i];
      const sourcePath = clipLocalPaths.get(seg.clipId);
      if (!sourcePath) {
        throw new ApiError(400, 'unknown_clip', `plan references clipId "${seg.clipId}" not present in clips[]`);
      }
      const outPath = path.join(segmentsDir, `segment-${i}.mp4`);
      await buildSegmentClip({
        inputPath: sourcePath,
        startMs: seg.startMs,
        endMs: seg.endMs,
        text: seg.text,
        outputPath: outPath,
        workDir: segmentsDir,
      });
      // segments[0].transitionIn is the hook->segment0 join; for i>0 it's
      // the join from the previous segment into this one.
      orderedClips.push({ path: outPath, transitionIn: seg.transitionIn });
    }

    if (input.plan.offer) {
      const offerPath = path.join(segmentsDir, 'offer.mp4');
      await buildTextCardClip({
        text: input.plan.offer.text,
        durationMs: input.plan.offer.durationMs,
        outputPath: offerPath,
        workDir: segmentsDir,
        primaryColor: input.brand.primaryColor,
      });
      orderedClips.push({ path: offerPath, transitionIn: DEFAULT_JOIN_TRANSITION });
    }

    const endingPath = path.join(segmentsDir, 'ending.mp4');
    const extraLines = [
      input.plan.ending.cta,
      input.plan.ending.whatsapp,
      input.plan.ending.location ?? input.brand.locationText,
    ].filter((v): v is string => Boolean(v && v.trim().length > 0));
    await buildTextCardClip({
      text: input.plan.ending.text,
      durationMs: input.plan.ending.durationMs,
      outputPath: endingPath,
      workDir: segmentsDir,
      primaryColor: input.brand.primaryColor,
      extraLines,
    });
    orderedClips.push({ path: endingPath, transitionIn: DEFAULT_JOIN_TRANSITION });

    // 4. Concatenate with transitions.
    const concatenatedPath = path.join(dir, 'concatenated.mp4');
    await concatWithTransitions(orderedClips, concatenatedPath);

    // 5. Optional logo watermark overlay.
    let withLogoPath = concatenatedPath;
    if (logoLocal) {
      withLogoPath = path.join(dir, 'with-logo.mp4');
      await overlayLogo({ videoPath: concatenatedPath, logoPath: logoLocal, outputPath: withLogoPath });
    }

    // 6. Mix in background music and produce the final export.
    const preMixProbe = await probeVideo(withLogoPath);
    const finalPath = path.join(dir, 'final.mp4');
    await mixMusicAndExport({
      silentVideoPath: withLogoPath,
      musicPath: musicLocal,
      outputPath: finalPath,
      durationSec: preMixProbe.durationMs / 1000,
    });

    // 7. Thumbnail from the final video (~1s in, or the hook's last frame if shorter).
    const finalProbe = await probeVideo(finalPath);
    const thumbLocal = path.join(dir, 'thumb.jpg');
    const thumbTimestampMs = Math.min(1000, Math.max(0, finalProbe.durationMs - 200));
    await extractThumbnail(finalPath, thumbLocal, finalProbe.durationMs, { timestampMs: thumbTimestampMs });

    // 8. Upload outputs.
    await uploadFile(finalPath, input.outputStoragePath, 'video/mp4');
    await uploadFile(thumbLocal, input.thumbnailStoragePath, 'image/jpeg');

    const result: RenderedReel = {
      outputStoragePath: input.outputStoragePath,
      thumbnailStoragePath: input.thumbnailStoragePath,
      durationMs: finalProbe.durationMs,
    };
    logger.info('renderReel complete', { reelId: input.reelId, durationMs: result.durationMs });
    return result;
  });
}

function validateInput(input: ReelRenderInput): void {
  if (!input.reelId || !input.businessId) {
    throw new ApiError(400, 'invalid_request', 'reelId and businessId are required');
  }
  if (!input.plan || !Array.isArray(input.plan.segments) || input.plan.segments.length === 0) {
    throw new ApiError(400, 'invalid_request', 'plan.segments must be a non-empty array');
  }
  if (!Array.isArray(input.clips) || input.clips.length === 0) {
    throw new ApiError(400, 'invalid_request', 'clips must be a non-empty array');
  }
  if (input.clips.length > MAX_REEL_CLIPS) {
    throw new ApiError(400, 'too_many_clips', `clips exceeds MAX_REEL_CLIPS (${MAX_REEL_CLIPS})`);
  }
  if (![15, 30, 45].includes(input.durationSeconds)) {
    throw new ApiError(400, 'invalid_duration', 'durationSeconds must be 15, 30, or 45');
  }
  if (!input.music || !input.music.storagePath) {
    throw new ApiError(400, 'invalid_request', 'music.storagePath is required');
  }
  if (!input.outputStoragePath || !input.thumbnailStoragePath) {
    throw new ApiError(400, 'invalid_request', 'outputStoragePath and thumbnailStoragePath are required');
  }
  for (const seg of input.plan.segments) {
    if (seg.endMs <= seg.startMs) {
      throw new ApiError(400, 'invalid_segment', `segment for clip ${seg.clipId} has endMs <= startMs`);
    }
  }
}

async function mkdir(dir: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(dir, { recursive: true });
}
