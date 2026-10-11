/**
 * The Gemini models Mitra runs on, in one place. Chosen from a real-pipeline benchmark
 * (docs/MODEL_BENCHMARK_2026-10.md); the previous default, gemini-1.5-flash, has been retired by Google
 * (404), as have the 1.5/2.0/2.5 families for our key.
 *
 * Each can be overridden per environment without a code change:
 *   GEMINI_TEXT_MODEL       campaign copy, strategy, planning, regeneration
 *   GEMINI_VISION_MODEL     product-photo and reference-style analysis
 *   GEMINI_DISCOVERY_MODEL  onboarding discovery (free to the owner, 20s cutoff)
 *
 * Text is a pinned id, not an alias: an alias can change what it points at without a release, and these
 * models were chosen by measurement. Re-run the benchmark when Google announces a retirement.
 */
export const DEFAULT_TEXT_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_VISION_MODEL = 'gemini-3.5-flash-lite';
// Alias on purpose: discovery was live-validated on it and is a lightweight, low-stakes workload.
export const DEFAULT_DISCOVERY_MODEL = 'gemini-flash-lite-latest';
/**
 * Image generation. gemini-2.5-flash-image was the previous default; Google's pricing page (read 2026-10-11, "last
 * updated 2026-10-09") lists it as deprecated and "shut down on October 2, 2026", naming gemini-3.1-flash-image or
 * gemini-3.1-flash-lite-image as replacements. The cheaper lite model is the default; its live output quality has NOT
 * been verified by a real run, so override with GEMINI_IMAGE_MODEL (e.g. gemini-3.1-flash-image) if it is not good enough.
 */
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';

export const textModel = (): string => process.env['GEMINI_TEXT_MODEL'] || DEFAULT_TEXT_MODEL;
export const visionModel = (): string => process.env['GEMINI_VISION_MODEL'] || DEFAULT_VISION_MODEL;
export const discoveryModel = (): string =>
  process.env['GEMINI_DISCOVERY_MODEL'] || DEFAULT_DISCOVERY_MODEL;
export const imageModel = (): string => process.env['GEMINI_IMAGE_MODEL'] || DEFAULT_IMAGE_MODEL;
