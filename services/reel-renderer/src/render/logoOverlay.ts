import { runFfmpeg } from '../lib/exec';

/**
 * Overlays the business logo as a small watermark in the top-right corner,
 * present for the whole video. Logo is scaled to a fixed width and padded
 * with a safe margin so it never collides with Instagram's own UI chrome.
 */
export async function overlayLogo(params: {
  videoPath: string;
  logoPath: string;
  outputPath: string;
}): Promise<void> {
  const { videoPath, logoPath, outputPath } = params;
  const logoWidth = 160;
  const margin = 40;

  await runFfmpeg([
    '-i',
    videoPath,
    '-i',
    logoPath,
    '-filter_complex',
    `[1:v]scale=${logoWidth}:-1[logo];[0:v][logo]overlay=W-w-${margin}:${margin}`,
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
