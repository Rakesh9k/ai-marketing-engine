import { runFfmpeg } from '../lib/exec';
import { buildCaptionFilter } from './textUtils';
import { FPS, PIX_FMT } from './constants';
import { OUTPUT_WIDTH_HEIGHT } from './videoSpec';

const DEFAULT_CARD_COLOR = '1a1a1a'; // neutral near-black, safe if brand.primaryColor is absent/invalid

function sanitizeHexColor(color: string | undefined): string {
  if (!color) return DEFAULT_CARD_COLOR;
  const hex = color.replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_CARD_COLOR;
}

/**
 * Builds a hook/offer/ending "title card": a solid brand-colored background
 * (a plain lavfi color source, not a video clip) with the segment's text
 * burned in — plus, for the ending card, optional CTA/WhatsApp/location
 * lines stacked underneath. This is deliberately simple (no Ken Burns pan,
 * no stock background) to keep the MVP reliable; see AGENTS instructions
 * favoring reliability over transition/effect variety.
 */
export async function buildTextCardClip(params: {
  text: string;
  durationMs: number;
  outputPath: string;
  workDir: string;
  primaryColor?: string;
  extraLines?: string[]; // e.g. CTA / WhatsApp / location, rendered stacked below the main text
}): Promise<void> {
  const { text, durationMs, outputPath, workDir, primaryColor, extraLines } = params;
  const { width, height } = OUTPUT_WIDTH_HEIGHT;
  const durationSec = Math.max(0.3, durationMs / 1000);
  const color = sanitizeHexColor(primaryColor);

  const filters = [
    await buildCaptionFilter({ text: text.trim(), workDir, position: 'center', fontSize: 64 }),
  ];

  if (extraLines && extraLines.length > 0) {
    const combined = extraLines.filter(Boolean).join('\n');
    filters.push(
      await buildCaptionFilter({
        text: combined,
        workDir,
        position: 'center',
        fontSize: 40,
        extraYOffset: 140,
      })
    );
  }

  await runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    `color=c=0x${color}:s=${width}x${height}:r=${FPS}:d=${durationSec.toFixed(3)}`,
    '-vf',
    filters.join(','),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '21',
    '-pix_fmt',
    PIX_FMT,
    outputPath,
  ]);
}
