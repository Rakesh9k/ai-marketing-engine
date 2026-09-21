/**
 * Wire-contract types for this service. These are intentionally a
 * hand-mirrored subset of the interfaces defined in
 * functions/src/services/videoRenderer.ts and functions/src/types/index.ts.
 *
 * This service is a separately deployed Cloud Run container (its own
 * package.json / npm install / Docker image) and does not share a build
 * with functions/, so the types are duplicated here rather than imported
 * across the service boundary. Keep these in sync by hand if the contract
 * in functions/src/services/videoRenderer.ts ever changes shape.
 */

export type ReelTransition = 'hard_cut' | 'fade' | 'dissolve' | 'zoom_punch';
export type ReelTemplateId = 'food_reveal' | 'offer' | 'behind_the_scenes';

export interface ReelEditPlanSegment {
  clipId: string;
  startMs: number;
  endMs: number;
  text?: string;
  transitionIn: ReelTransition;
}

export interface ReelEditPlan {
  templateId: ReelTemplateId;
  hook: { text: string; durationMs: number };
  segments: ReelEditPlanSegment[];
  offer?: { text: string; durationMs: number };
  ending: { text: string; durationMs: number; cta?: string; whatsapp?: string; location?: string };
  musicTrackId: string;
  totalDurationMs: number;
}

export interface ReelMusicTrack {
  id: string;
  name: string;
  category: 'energetic' | 'premium' | 'local' | 'food' | 'cinematic' | 'fun' | 'minimal' | 'offer';
  mood: string;
  durationSeconds: number;
  bpm?: number;
  license: string;
  source: string;
  attributionRequired: boolean;
  attributionText?: string;
  /** Linear gain multiplier (0-1) applied when mixing under the video — see audioMix.ts. */
  recommendedVolume: number;
  storagePath: string;
}

export interface ClipAnalysisInput {
  clipId: string;
  storagePath: string;
}

export interface ClipAnalysisOutput {
  clipId: string;
  durationMs: number;
  width: number;
  height: number;
  thumbnailStoragePath: string;
  brightnessScore: number;
  motionScore: number;
}

export interface ReelRenderClipInput {
  clipId: string;
  storagePath: string;
}

export interface ReelRenderBrandInput {
  businessName: string;
  logoStoragePath?: string;
  primaryColor?: string;
  locationText?: string;
}

export type ReelDurationSeconds = 15 | 30 | 45;

export interface ReelRenderInput {
  reelId: string;
  businessId: string;
  durationSeconds: ReelDurationSeconds;
  style: string;
  plan: ReelEditPlan;
  clips: ReelRenderClipInput[];
  music: ReelMusicTrack;
  brand: ReelRenderBrandInput;
  outputStoragePath: string;
  thumbnailStoragePath: string;
}

export interface RenderedReel {
  outputStoragePath: string;
  thumbnailStoragePath: string;
  durationMs: number;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
