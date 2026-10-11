import { runFfmpeg } from './exec';

/**
 * Extracts one representative JPEG frame. Picking a frame 30-40% into the
 * clip (not frame 0) avoids the common "black/blurred start frame while the
 * phone camera is still stabilizing" problem.
 */
export async function extractThumbnail(
  inputPath: string,
  outputPath: string,
  durationMs: number,
  options?: { fraction?: number; timestampMs?: number }
): Promise<void> {
  const timestampSec =
    options?.timestampMs !== undefined
      ? Math.max(0, options.timestampMs / 1000)
      : Math.max(0, (durationMs / 1000) * (options?.fraction ?? 0.35));
  await runFfmpeg([
    '-ss',
    timestampSec.toFixed(3),
    '-i',
    inputPath,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    outputPath,
  ]);
}
