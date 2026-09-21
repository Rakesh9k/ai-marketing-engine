import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { getEnvConfig } from '../config/env';
import type { ReelEditPlan, ReelMusicTrack } from '../types';
import { createLogger } from '../utils/logging';

const logger = createLogger({ component: 'videoRenderer' });

/**
 * Deterministic video rendering is intentionally kept behind this interface
 * and OUT of the AI layer (services/ai/*) — the AI only ever produces a
 * validated ReelEditPlan; it never touches ffmpeg, storage paths, or
 * rendering commands directly (see AGENTS.md section 14/15).
 */
export interface ClipAnalysisInput {
  clipId: string;
  storagePath: string;
}

export interface ClipAnalysisOutput {
  clipId: string;
  durationMs: number;
  width: number;
  height: number;
  /** Storage path of a single extracted representative thumbnail frame, used for Vision AI scene classification. */
  thumbnailStoragePath: string;
  /** 0-1 deterministic brightness heuristic; very dark clips score low. */
  brightnessScore: number;
  /** 0-1 deterministic frame-to-frame motion heuristic; near-static clips score low. */
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

export interface ReelRenderInput {
  reelId: string;
  businessId: string;
  durationSeconds: 15 | 30 | 45;
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

export interface VideoRenderer {
  analyzeClip(input: ClipAnalysisInput): Promise<ClipAnalysisOutput>;
  renderReel(input: ReelRenderInput): Promise<RenderedReel>;
}

/**
 * Production renderer: a Cloud Run service running ffmpeg (services/reel-renderer/).
 * Cloud Functions Gen2 `onCall` callables are unsuited to long/heavy video
 * encoding (short default timeouts, no persistent CPU during long I/O waits
 * on some tiers) — the actual trim/crop/concat/text/music/export work
 * happens in that separately deployed, separately scaled service; this class
 * is just the authenticated HTTP client for it.
 */
export class CloudRunVideoRenderer implements VideoRenderer {
  private readonly baseUrl: string;
  private readonly auth: GoogleAuth;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = new GoogleAuth();
  }

  private async authHeader(): Promise<Record<string, string>> {
    // Cloud Run service-to-service auth via an OIDC identity token (the
    // service is deployed with --no-allow-unauthenticated) rather than a
    // static shared secret. REEL_RENDERER_API_KEY (if set) is layered on
    // top as defense-in-depth, not a replacement for this.
    const client = await this.auth.getIdTokenClient(this.baseUrl);
    const headers = await client.getRequestHeaders();
    const config = getEnvConfig();
    return {
      ...(headers as unknown as Record<string, string>),
      ...(config.REEL_RENDERER_API_KEY ? { 'x-api-key': config.REEL_RENDERER_API_KEY } : {}),
    };
  }

  async analyzeClip(input: ClipAnalysisInput): Promise<ClipAnalysisOutput> {
    const headers = await this.authHeader();
    const response = await fetch(`${this.baseUrl}/analyze-clip`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(
        `Renderer analyze-clip failed (${response.status}): ${await response.text()}`
      );
    }
    return (await response.json()) as ClipAnalysisOutput;
  }

  async renderReel(input: ReelRenderInput): Promise<RenderedReel> {
    const headers = await this.authHeader();
    const response = await fetch(`${this.baseUrl}/render`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Renderer render failed (${response.status}): ${await response.text()}`);
    }
    return (await response.json()) as RenderedReel;
  }
}

/**
 * Development/emulator renderer: no ffmpeg call, no Cloud Run dependency.
 * Produces deterministic, clearly-fake output so local development and CI
 * can exercise the full generateReel pipeline without real video encoding.
 *
 * IMPORTANT: gated behind FUNCTIONS_EMULATOR / missing REEL_RENDERER_URL in
 * getVideoRenderer() below — never selected when a real renderer URL is
 * configured, so it cannot silently ship as production behavior.
 */
export class DevMockVideoRenderer implements VideoRenderer {
  async analyzeClip(input: ClipAnalysisInput): Promise<ClipAnalysisOutput> {
    logger.info('devMock.analyzeClip', { clipId: input.clipId });
    return {
      clipId: input.clipId,
      durationMs: 8000,
      width: 1080,
      height: 1920,
      thumbnailStoragePath: input.storagePath.replace(/\.[^/.]+$/, '_thumb.jpg'),
      brightnessScore: 0.7,
      motionScore: 0.5,
    };
  }

  async renderReel(input: ReelRenderInput): Promise<RenderedReel> {
    logger.info('devMock.renderReel', { reelId: input.reelId, clipCount: input.clips.length });
    const bucket = admin.storage().bucket();
    const placeholder = Buffer.from(
      `MITRA_DEV_MOCK_REEL reelId=${input.reelId} clips=${input.clips.length}`
    );
    await bucket
      .file(input.outputStoragePath)
      .save(placeholder, { metadata: { contentType: 'video/mp4' }, resumable: false });
    await bucket
      .file(input.thumbnailStoragePath)
      .save(placeholder, { metadata: { contentType: 'image/jpeg' }, resumable: false });
    return {
      outputStoragePath: input.outputStoragePath,
      thumbnailStoragePath: input.thumbnailStoragePath,
      durationMs: input.durationSeconds * 1000,
    };
  }
}

let cachedRenderer: VideoRenderer | null = null;

export function getVideoRenderer(): VideoRenderer {
  if (cachedRenderer) return cachedRenderer;
  const config = getEnvConfig();
  if (config.REEL_RENDERER_URL && config.NODE_ENV === 'production') {
    cachedRenderer = new CloudRunVideoRenderer(config.REEL_RENDERER_URL);
  } else if (config.REEL_RENDERER_URL && !config.FUNCTIONS_EMULATOR) {
    cachedRenderer = new CloudRunVideoRenderer(config.REEL_RENDERER_URL);
  } else {
    cachedRenderer = new DevMockVideoRenderer();
  }
  return cachedRenderer;
}
