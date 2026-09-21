import { runFfmpeg } from '../lib/exec';
import { buildCaptionFilter } from './textUtils';
import { FPS, PIX_FMT } from './constants';
import { OUTPUT_WIDTH_HEIGHT } from './videoSpec';

/**
 * Trims a raw source clip to [startMs, endMs], scales+crops it to a
 * center-cropped 1080x1920 (never stretches — landscape/non-vertical source
 * footage is scaled up to cover the frame then cropped to fill it), and
 * optionally burns in the segment's caption text as a lower-third. Audio is
 * dropped here (see renderReel.ts header comment on the audio strategy) —
 * the final render's only audio track is the background music bed added at
 * the very end.
 */
export async function buildSegmentClip(params: {
  inputPath: string;
  startMs: number;
  endMs: number;
  text?: string;
  outputPath: string;
  workDir: string;
}): Promise<void> {
  const { inputPath, startMs, endMs, text, outputPath, workDir } = params;
  const startSec = startMs / 1000;
  const durationSec = Math.max(0.05, (endMs - startMs) / 1000);
  const { width, height } = OUTPUT_WIDTH_HEIGHT;

  const filters = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `fps=${FPS}`,
    `format=${PIX_FMT}`,
  ];

  if (text && text.trim().length > 0) {
    filters.push(
      await buildCaptionFilter({ text: text.trim(), workDir, position: 'lower_third', fontSize: 52 })
    );
  }

  await runFfmpeg([
    '-ss',
    startSec.toFixed(3),
    '-i',
    inputPath,
    '-t',
    durationSec.toFixed(3),
    '-vf',
    filters.join(','),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '21',
    outputPath,
  ]);
}
