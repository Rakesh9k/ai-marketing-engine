import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { FONT_PATHS } from './constants';
import { OUTPUT_WIDTH_HEIGHT } from './videoSpec';
import { segmentByScript } from './scriptSegmentation';
import { measureRunWidthPx, ascentPx, lineHeightPx } from './fontMetrics';

/**
 * Writes one script run's text to a small temp .txt file and returns its
 * path, for use with drawtext's `textfile=` option — instead of ever
 * inlining user-controlled text into an ffmpeg filter-string. drawtext's
 * inline `text=` option requires escaping colons/backslashes/quotes/percent
 * signs, and getting that escaping wrong on arbitrary user text is a real
 * (if shell-injection-free) correctness hazard; textfile= sidesteps it
 * because the only string that ever enters the filter graph syntax is our
 * own UUID-based temp path, which is guaranteed free of filter-special
 * characters.
 */
async function writeCaptionFile(dir: string, text: string): Promise<string> {
  const file = path.join(dir, `caption-${randomUUID()}.txt`);
  await fs.writeFile(file, text, 'utf8');
  return file;
}

export type TextPosition = 'center' | 'lower_third';

export interface CaptionFilterOptions {
  text: string;
  workDir: string;
  position: TextPosition;
  fontSize?: number;
  extraYOffset?: number; // px, applied after position is resolved (e.g. to stack CTA lines)
}

const BOX_PAD = 24; // matches the previous single-drawtext boxborderw
const LINE_SPACING = 8; // matches the previous drawtext line_spacing

interface MeasuredRun {
  fontPath: string;
  textFile: string;
  widthPx: number;
  ascentPx: number;
}

interface MeasuredLine {
  runs: MeasuredRun[];
  widthPx: number;
  lineHeightPx: number;
  ascentPx: number;
}

/**
 * Builds the drawtext/drawbox filter fragment(s) for one caption block:
 * white text on a semi-opaque black box, safe side margins, positioned
 * either dead-center (hook/offer/ending title cards) or as a lower-third
 * caption (per-segment burned-in text). `\n` in `text` renders as stacked
 * lines (e.g. the ending card's CTA/WhatsApp/location block), matching the
 * previous single-drawtext behavior.
 *
 * ffmpeg's drawtext loads exactly one font per filter instance with no
 * per-glyph fallback, so each line is further split into per-script runs
 * (scriptSegmentation.ts) — e.g. "आज Biryani का mood है?" becomes
 * devanagari/latin/devanagari/latin/devanagari runs — each drawn with its
 * own drawtext filter using that script's font, positioned side-by-side on
 * a shared baseline computed from font metrics (fontMetrics.ts). A single
 * drawbox filter (drawn first, so text layers on top of it) provides one
 * unified background spanning the whole block instead of one box per run.
 */
export async function buildCaptionFilter(opts: CaptionFilterOptions): Promise<string> {
  const fontSize = opts.fontSize ?? 56;
  const extraYOffset = opts.extraYOffset ?? 0;
  const { width: containerWidth, height: containerHeight } = OUTPUT_WIDTH_HEIGHT;

  const lines = opts.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return '';

  const measuredLines: MeasuredLine[] = await Promise.all(
    lines.map(async (lineText) => {
      const runs = segmentByScript(lineText).filter((r) => r.text.length > 0);
      const measuredRuns: MeasuredRun[] = await Promise.all(
        runs.map(async (run) => {
          const fontPath = FONT_PATHS[run.script];
          const textFile = await writeCaptionFile(opts.workDir, run.text);
          return {
            fontPath,
            textFile,
            widthPx: measureRunWidthPx(fontPath, run.text, fontSize),
            ascentPx: ascentPx(fontPath, fontSize),
          };
        })
      );
      return {
        runs: measuredRuns,
        widthPx: measuredRuns.reduce((sum, r) => sum + r.widthPx, 0),
        lineHeightPx: Math.max(...runs.map((r) => lineHeightPx(FONT_PATHS[r.script], fontSize))),
        ascentPx: Math.max(...measuredRuns.map((r) => r.ascentPx)),
      };
    })
  );

  const maxLineWidth = Math.max(...measuredLines.map((l) => l.widthPx));
  const totalTextHeight =
    measuredLines.reduce((sum, l) => sum + l.lineHeightPx, 0) + LINE_SPACING * (measuredLines.length - 1);

  const boxWidth = maxLineWidth + BOX_PAD * 2;
  const boxHeight = totalTextHeight + BOX_PAD * 2;
  const boxX = Math.round((containerWidth - boxWidth) / 2);
  const boxY = Math.round(
    (opts.position === 'center' ? (containerHeight - boxHeight) / 2 : containerHeight - boxHeight - 260) +
      extraYOffset
  );

  const filters: string[] = [
    `drawbox=x=${boxX}:y=${boxY}:w=${Math.round(boxWidth)}:h=${Math.round(boxHeight)}:color=black@0.45:t=fill`,
  ];

  let cursorY = boxY + BOX_PAD;
  for (const line of measuredLines) {
    const lineStartX = Math.round(boxX + BOX_PAD + (maxLineWidth - line.widthPx) / 2);
    const baselineY = cursorY + line.ascentPx;
    let cursorX = lineStartX;
    for (const run of line.runs) {
      const runY = Math.round(baselineY - run.ascentPx);
      filters.push(
        `drawtext=fontfile='${escapeFilterPath(run.fontPath)}':textfile='${escapeFilterPath(run.textFile)}':` +
          `reload=0:fontsize=${fontSize}:fontcolor=white:box=0:x=${Math.round(cursorX)}:y=${runY}`
      );
      cursorX += run.widthPx;
    }
    cursorY += line.lineHeightPx + LINE_SPACING;
  }

  return filters.join(',');
}

/** Escapes a filesystem path for safe embedding inside a quoted ffmpeg filter option. */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}
