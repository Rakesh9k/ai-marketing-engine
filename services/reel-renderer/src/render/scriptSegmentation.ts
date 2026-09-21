/**
 * Deterministic script classification and run-splitting for drawtext.
 *
 * ffmpeg's drawtext filter loads exactly one font file per filter instance
 * and does not do per-glyph font fallback, so a single caption mixing Latin
 * (English/Hinglish) with Devanagari (Hindi) or Telugu text cannot be
 * rendered correctly with one font file. This was verified empirically
 * (not assumed): `NotoSansDevanagari-Bold.ttf` and `NotoSansTelugu-Bold.ttf`
 * contain zero Latin A-Z/a-z glyphs (checked via fontkit cmap inspection —
 * see assets/fonts/NOTICE.md), so loading only the Hindi or Telugu font for
 * a mixed-script caption would render every embedded English word as tofu.
 *
 * Classification is done by scanning actual Unicode codepoints in the text
 * — never by any upstream "language" field the AI generation pipeline may
 * have attached to a caption (e.g. a plan segment's inferred locale). That
 * metadata can be wrong, stale, or simply absent; rendering must stay safe
 * (no tofu, no crash) regardless of what it claims.
 */

export type Script = 'devanagari' | 'telugu' | 'latin';

const DEVANAGARI_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0900, 0x097f], // Devanagari
  [0xa8e0, 0xa8ff], // Devanagari Extended
];

const TELUGU_RANGES: ReadonlyArray<readonly [number, number]> = [[0x0c00, 0x0c7f]]; // Telugu

function inRanges(cp: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  return ranges.some(([start, end]) => cp >= start && cp <= end);
}

/**
 * Classifies a single codepoint. Returns null for script-neutral characters
 * (spaces, digits, punctuation, currency symbols, emoji, etc.) — the caller
 * folds these into whichever run they're adjacent to, so e.g. "आज " doesn't
 * fragment into a devanagari run plus a separate one-space latin run.
 */
function classifyCodePoint(cp: number): Script | null {
  if (inRanges(cp, DEVANAGARI_RANGES)) return 'devanagari';
  if (inRanges(cp, TELUGU_RANGES)) return 'telugu';
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return 'latin';
  return null;
}

export interface ScriptRun {
  script: Script;
  text: string;
}

/**
 * Splits text into runs of consecutive characters belonging to the same
 * script, attaching script-neutral characters to the current run instead of
 * starting a new one. Leading neutral characters default to 'latin' (its
 * font has the broadest neutral-character coverage of the three, including
 * ₹ and curly quotes).
 */
export function segmentByScript(text: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  let current: Script = 'latin';
  let buffer = '';

  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    const classified = classifyCodePoint(cp);
    const script: Script = classified ?? current;
    if (buffer && script !== current) {
      runs.push({ script: current, text: buffer });
      buffer = '';
    }
    current = script;
    buffer += ch;
  }
  if (buffer) runs.push({ script: current, text: buffer });
  return runs;
}
