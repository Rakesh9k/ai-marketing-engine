/**
 * PHASE 18 — Audio Engine
 * Configures voiceover, background music, and audio priority mixing (Voice > Music > SFX).
 */

import type { AudioTrack, ReelScript } from '../types/execution.types';

export class AudioEngine {
  /**
   * Generates audio track specifications for a reel timeline.
   */
  public prepareAudioTracks(
    script: ReelScript,
    voiceoverUrl?: string,
    musicUrl?: string
  ): AudioTrack[] {
    const tracks: AudioTrack[] = [];

    // 1. Voiceover Track (Highest Priority: Volume 1.0)
    tracks.push({
      id: 'track_voiceover',
      source: voiceoverUrl || 'voiceover_generated.mp3',
      durationMs: script.totalDurationMs,
      role: 'voice',
      volume: 1.0, // Primary priority
    });

    // 2. Background Music Track (Secondary Priority: Volume 0.25 to prevent masking voiceover)
    if (musicUrl) {
      tracks.push({
        id: 'track_music',
        source: musicUrl,
        durationMs: script.totalDurationMs,
        role: 'music',
        volume: 0.25, // Ducked volume so voice remains crystal clear
      });
    }

    return tracks;
  }
}
