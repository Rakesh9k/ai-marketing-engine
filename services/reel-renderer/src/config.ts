/**
 * Mirrors the cost/robustness ceilings in functions/src/config/reels.ts.
 * Kept in sync by hand for the same reason as src/types.ts (separate
 * deployable, no shared build with functions/).
 */
export const MIN_REEL_CLIPS = 3;
export const MAX_REEL_CLIPS = 10;
export const MAX_CLIP_DURATION_MS = 60_000;

export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1920;

export const PORT = Number(process.env.PORT) || 8080;
export const API_KEY = process.env.REEL_RENDERER_API_KEY || '';

/** Ceiling well under the 540s Cloud Functions timeout that awaits /render. */
export const MAX_RENDER_MS = 5 * 60 * 1000;
