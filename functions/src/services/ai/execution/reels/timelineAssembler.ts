/**
 * PHASE 18 — Timeline Assembler
 * Assembles video tracks, audio tracks, and caption tracks into a canonical Timeline contract.
 */

import type { AudioTrack, ReelShot, Timeline } from '../types/execution.types';

export class TimelineAssembler {
  /**
   * Builds a canonical Timeline for renderer consumption.
   */
  public assembleTimeline(shots: ReelShot[], audioTracks: AudioTrack[]): Timeline {
    let currentTimeMs = 0;

    const videoTracks = shots.map((shot) => {
      const startTimeMs = currentTimeMs;
      currentTimeMs += shot.durationMs;

      return {
        clipId: shot.id,
        storagePath: `clips/${shot.id}.mp4`,
        startTimeMs,
        durationMs: shot.durationMs,
        textOverlay: shot.textOverlay,
      };
    });

    const captionTrack = {
      captions: shots
        .filter((s) => Boolean(s.textOverlay))
        .map((s) => {
          const track = videoTracks.find((vt) => vt.clipId === s.id);
          const startTimeMs = track?.startTimeMs || 0;
          return {
            text: s.textOverlay!,
            startTimeMs,
            endTimeMs: startTimeMs + s.durationMs,
          };
        }),
    };

    return {
      durationMs: currentTimeMs,
      videoTracks,
      audioTracks,
      captionTrack,
    };
  }
}
