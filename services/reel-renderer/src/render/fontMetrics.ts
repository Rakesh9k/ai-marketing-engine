// fontkit ships no bundled TypeScript types (matches the ffprobe-static
// require+cast pattern already used in lib/ffmpegPath.ts).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontkit = require('fontkit') as {
  openSync(path: string): FontkitFont;
};

interface FontkitGlyph {
  advanceWidth: number;
}

interface FontkitFont {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  glyphsForString(text: string): FontkitGlyph[];
}

const fontCache = new Map<string, FontkitFont>();

function loadFont(fontPath: string): FontkitFont {
  let font = fontCache.get(fontPath);
  if (!font) {
    font = fontkit.openSync(fontPath);
    fontCache.set(fontPath, font);
  }
  return font;
}

/**
 * Measures a run's rendered width in pixels at the given font size, using
 * raw per-codepoint glyph advance widths (`glyphsForString`, no GSUB
 * ligature/conjunct substitution) rather than `font.layout()`'s shaped
 * width. This intentionally approximates what ffmpeg's drawtext filter
 * actually draws: although the bundled ffmpeg binary has HarfBuzz shaping
 * available (`text_shaping=true` by default), testing found it does not
 * reliably apply GSUB substitution for Telugu base+matra sequences (see
 * README "Font strategy" for the confirmed root cause), so assuming
 * shaped/merged-glyph widths would under-measure some Telugu runs. This is
 * still only an approximation (hinting/rounding differ from ffmpeg's own
 * rasterizer, and it can't predict which specific sequences ffmpeg fails to
 * shape), acceptable for centering short caption lines; see
 * "remaining limitations" in the font report for what this does not fix
 * (Devanagari/Telugu conjunct shaping quality itself).
 */
export function measureRunWidthPx(fontPath: string, text: string, fontSizePx: number): number {
  const font = loadFont(fontPath);
  const glyphs = font.glyphsForString(text);
  const totalUnits = glyphs.reduce((sum, g) => sum + g.advanceWidth, 0);
  return (totalUnits / font.unitsPerEm) * fontSizePx;
}

/** Ascent in pixels at the given font size — used to align different fonts' runs on a shared baseline. */
export function ascentPx(fontPath: string, fontSizePx: number): number {
  const font = loadFont(fontPath);
  return (font.ascent / font.unitsPerEm) * fontSizePx;
}

/** Combined ascent+|descent| in pixels — used to size the caption background box tall enough for the tallest script in use. */
export function lineHeightPx(fontPath: string, fontSizePx: number): number {
  const font = loadFont(fontPath);
  return ((font.ascent + Math.abs(font.descent)) / font.unitsPerEm) * fontSizePx;
}
