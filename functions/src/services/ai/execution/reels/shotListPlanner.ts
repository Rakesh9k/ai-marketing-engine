/**
 * PHASE 18 — Shot List Planner
 * Maps ReelScript segments into a structured shot list for visual asset production.
 */

import type { ReelScript, ReelShot } from '../types/execution.types';

export class ShotListPlanner {
  /**
   * Translates a ReelScript into an ordered list of ReelShots.
   */
  public planShots(script: ReelScript): ReelShot[] {
    const shots: ReelShot[] = [];
    let order = 1;

    // 1. Hook Shot
    shots.push({
      id: `shot_${order}`,
      sequenceOrder: order++,
      durationMs: script.hook.durationMs,
      purpose: 'Hook audience & establish tension',
      visualDirection: 'Expressive close-up showing food decision debate',
      assetRequirement: 'Family food debate scene',
      cameraDirection: 'Quick push-in',
      textOverlay: script.hook.captionText,
      voiceover: script.hook.voiceoverText,
      transition: 'hard_cut',
      motion: 'fast_push_in',
      strategySource: script.hook.strategySource.blueprintField,
    });

    // 2. Beat Shots
    script.beats.forEach((beat) => {
      shots.push({
        id: `shot_${order}`,
        sequenceOrder: order++,
        durationMs: beat.durationMs,
        purpose: beat.strategySource.purpose,
        visualDirection: `Visual matching beat: ${beat.text}`,
        assetRequirement: `Visual element for ${beat.type}`,
        cameraDirection: 'Smooth pan',
        textOverlay: beat.captionText,
        voiceover: beat.voiceoverText,
        transition: 'cross_fade',
        motion: 'smooth_pan',
        strategySource: beat.strategySource.blueprintField,
      });
    });

    // 3. Final Message Shot
    shots.push({
      id: `shot_${order}`,
      sequenceOrder: order++,
      durationMs: script.finalMessage.durationMs,
      purpose: script.finalMessage.strategySource.purpose,
      visualDirection: 'Warm family table spread with steaming multi-cuisine dishes',
      assetRequirement: 'Multi-cuisine family table spread',
      cameraDirection: 'Slow zoom out',
      textOverlay: script.finalMessage.captionText,
      voiceover: script.finalMessage.voiceoverText,
      transition: 'fade_to_black',
      motion: 'slow_zoom_out',
      strategySource: script.finalMessage.strategySource.blueprintField,
    });

    // 4. CTA Shot
    shots.push({
      id: `shot_${order}`,
      sequenceOrder: order++,
      durationMs: script.cta.durationMs,
      purpose: script.cta.strategySource.purpose,
      visualDirection: 'Clean end card with logo and CTA button',
      assetRequirement: 'End card graphic with brand logo',
      cameraDirection: 'Static',
      textOverlay: script.cta.captionText,
      voiceover: script.cta.voiceoverText,
      transition: 'none',
      motion: 'subtle_pulse',
      strategySource: script.cta.strategySource.blueprintField,
    });

    return shots;
  }
}
