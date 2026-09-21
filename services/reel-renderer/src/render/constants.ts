import * as path from 'path';
import type { Script } from './scriptSegmentation';

export const FPS = 30;
export const PIX_FMT = 'yuv420p';

/**
 * Fonts are vendored directly in the repo under assets/fonts/ (SIL OFL 1.1,
 * see assets/fonts/NOTICE.md) and COPYed into the image by the Dockerfile —
 * not apt-installed and not read from whatever fonts happen to exist on the
 * host. This keeps the exact font bytes identical across every build and
 * requires no network access at render time.
 *
 * One font file per script rather than one merged font: NotoSansDevanagari
 * and NotoSansTelugu carry zero Latin glyphs (verified via cmap inspection
 * — see assets/fonts/NOTICE.md), so mixed-script captions are rendered as
 * multiple drawtext filters, one per script run — see scriptSegmentation.ts
 * and textUtils.ts.
 *
 * Default path is resolved relative to this compiled module
 * (lib/render/constants.js -> ../../assets/fonts) rather than hardcoded to
 * a container-only absolute path, so it resolves correctly both inside the
 * Docker image (assets/ sits next to lib/ under /app, per the Dockerfile's
 * `COPY assets ./assets`) and in local dev run from the repo checkout —
 * no env var override needed in either case.
 */
const FONTS_DIR = process.env.DRAWTEXT_FONTS_DIR || path.join(__dirname, '..', '..', 'assets', 'fonts');

export const FONT_PATHS: Record<Script, string> = {
  latin: process.env.DRAWTEXT_FONT_LATIN || path.join(FONTS_DIR, 'NotoSans-Bold.ttf'),
  devanagari: process.env.DRAWTEXT_FONT_DEVANAGARI || path.join(FONTS_DIR, 'NotoSansDevanagari-Bold.ttf'),
  telugu: process.env.DRAWTEXT_FONT_TELUGU || path.join(FONTS_DIR, 'NotoSansTelugu-Bold.ttf'),
};

/** Crossfade durations (seconds) per transition style — see README "Transitions". */
export const TRANSITION_DURATIONS: Record<string, number> = {
  hard_cut: 0.05,
  fade: 0.4,
  dissolve: 0.45,
  zoom_punch: 0.35,
};

/** Maps our ReelTransition names to ffmpeg's xfade `transition=` names. */
export const XFADE_NAMES: Record<string, string> = {
  hard_cut: 'fade',
  fade: 'fade',
  dissolve: 'dissolve',
  zoom_punch: 'zoomin',
};

/** Fallback transition for hook->segment0 / offer / ending joins that have no explicit transitionIn in the plan. */
export const DEFAULT_JOIN_TRANSITION = 'fade';
