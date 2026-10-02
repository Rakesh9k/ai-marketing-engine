import { geminiTextProvider } from '../text';
import { geminiVisionProvider, geminiReelVisionProvider } from '../vision';
import { geminiImageProvider } from '../image';
import { veoProvider } from '../providers/veo/VeoProvider';
import { elevenLabsProvider } from '../providers/elevenlabs/ElevenLabsProvider';
import { photoroomProvider } from '../providers/photoroom/PhotoroomProvider';
import { CompositeImageAI } from '../providers/gemini/CompositeImageAI';
import { getVideoRenderer } from '../../videoRenderer';
import type {
  TextAI,
  VisionAI,
  ReelVisionAI,
  ImageAI,
  VideoAI,
  AudioAI,
  Renderer,
} from '../interfaces';

/**
 * Single controlled place where AI provider implementations are selected.
 * Business logic and Cloud Functions must call these functions rather than
 * importing/constructing a concrete provider directly — that is what makes
 * a future provider swap (e.g. TextAI: Gemini today, something else
 * tomorrow) a change confined to this file, per docs/AI_ARCHITECTURE.md.
 *
 * All functions currently return the same singleton instances that were
 * already exported from text.ts/vision.ts/image.ts/videoRenderer.ts —
 * Phase 0 adds the indirection point without changing runtime behavior for
 * any already-working capability.
 */

const compositeImageAI = new CompositeImageAI(geminiImageProvider, photoroomProvider);

export function getTextAI(): TextAI {
  return geminiTextProvider;
}

export function getVisionAI(): VisionAI {
  return geminiVisionProvider;
}

export function getReelVisionAI(): ReelVisionAI {
  return geminiReelVisionProvider;
}

export function getImageAI(): ImageAI {
  return compositeImageAI;
}

/** Architected, not yet configured — throws on use. See docs/AI_ARCHITECTURE.md. */
export function getVideoAI(): VideoAI {
  return veoProvider;
}

/** Architected, not yet configured — throws on use. See docs/AI_ARCHITECTURE.md. */
export function getAudioAI(): AudioAI {
  return elevenLabsProvider;
}

/** Mitra's own deterministic Reel renderer (Cloud Run ffmpeg), or the dev mock. */
export function getRenderer(): Renderer {
  return getVideoRenderer();
}
