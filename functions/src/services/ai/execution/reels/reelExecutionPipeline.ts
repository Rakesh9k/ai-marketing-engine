/**
 * PHASE 18 — Reel Execution Pipeline
 * Coordinates Reel Script Generation, Shot Planning, Audio Priority Mixing, Timeline Assembly,
 * and Cloud Run Video Renderer invocation.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import { getVideoRenderer, type VideoRenderer } from '../../../videoRenderer';
import type { StrategyLock } from '../strategyFidelity';
import type { Timeline } from '../types/execution.types';
import { AudioEngine } from './audioEngine';
import { ReelScriptGenerator } from './reelScriptGenerator';
import { ShotListPlanner } from './shotListPlanner';
import { TimelineAssembler } from './timelineAssembler';

export interface ReelPipelineResult {
  timeline: Timeline;
  outputStoragePath: string;
  thumbnailStoragePath: string;
  durationMs: number;
}

export class ReelExecutionPipeline {
  private readonly scriptGenerator: ReelScriptGenerator;
  private readonly shotPlanner: ShotListPlanner;
  private readonly audioEngine: AudioEngine;
  private readonly timelineAssembler: TimelineAssembler;

  constructor(
    scriptGenerator?: ReelScriptGenerator,
    shotPlanner?: ShotListPlanner,
    audioEngine?: AudioEngine,
    timelineAssembler?: TimelineAssembler
  ) {
    this.scriptGenerator = scriptGenerator || new ReelScriptGenerator();
    this.shotPlanner = shotPlanner || new ShotListPlanner();
    this.audioEngine = audioEngine || new AudioEngine();
    this.timelineAssembler = timelineAssembler || new TimelineAssembler();
  }

  /**
   * Executes the complete reel production pipeline.
   */
  public async executePipeline(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    customRenderer?: VideoRenderer
  ): Promise<ReelPipelineResult> {
    // 1. Script Generation
    const script = this.scriptGenerator.generateScript(blueprint);

    // 2. Shot List Planning
    const shots = this.shotPlanner.planShots(script);

    // 3. Audio Priority Mixing
    const audioTracks = this.audioEngine.prepareAudioTracks(script);

    // 4. Timeline Assembly
    const timeline = this.timelineAssembler.assembleTimeline(shots, audioTracks);

    // 5. Cloud Run Video Renderer Invocation
    const renderer = customRenderer || getVideoRenderer();
    const outputStoragePath = `reels/${blueprint.campaignId}/${blueprint.id}_${Date.now()}.mp4`;
    const thumbnailStoragePath = `reels/${blueprint.campaignId}/${blueprint.id}_thumb_${Date.now()}.jpg`;

    const renderInput = {
      reelId: blueprint.id,
      businessId: blueprint.tenantId,
      durationSeconds: (script.totalDurationMs <= 15000 ? 15 : 30) as 15 | 30 | 45,
      style: blueprint.motionDirection?.motionStyle || 'warm_smooth',
      plan: {
        templateId: 'food_reveal' as const,
        hook: { text: script.hook.text, durationMs: script.hook.durationMs },
        segments: shots.map((s) => ({
          clipId: s.id,
          startMs: 0,
          endMs: s.durationMs,
          text: s.textOverlay,
          transitionIn: 'hard_cut' as const,
        })),
        offer: blueprint.offer?.exists ? { text: blueprint.offer.name || '', durationMs: 3000 } : undefined,
        ending: { text: script.finalMessage.text, durationMs: script.finalMessage.durationMs, cta: script.cta.text },
        musicTrackId: 'track_bg_1',
        totalDurationMs: script.totalDurationMs,
      },
      clips: shots.map((s) => ({ clipId: s.id, storagePath: `clips/${s.id}.mp4` })),
      music: {
        id: 'track_bg_1',
        name: 'Background Acoustic',
        category: 'food' as const,
        mood: 'warm',
        durationSeconds: 30,
        license: 'royalty_free',
        source: 'mitra_library',
        storagePath: 'audio/bg_acoustic.mp3',
        attributionRequired: false,
        recommendedVolume: 0.25,
      },
      brand: {
        businessName: blueprint.product?.name || 'Mitra Business',
        locationText: 'Hyderabad',
      },
      outputStoragePath,
      thumbnailStoragePath,
    };

    const rendered = await renderer.renderReel(renderInput);

    return {
      timeline,
      outputStoragePath: rendered.outputStoragePath,
      thumbnailStoragePath: rendered.thumbnailStoragePath,
      durationMs: rendered.durationMs,
    };
  }
}
