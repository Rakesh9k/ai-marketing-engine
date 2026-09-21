import type {
  ReelDurationSeconds,
  ReelGoal,
  ReelMusicTrack,
  ReelStyle,
  ReelTemplateId,
  ReelTransition,
} from '../types';

/** Storage prefix every real music track must live under — see storage.rules and AGENTS.md section 22 "MUSIC". */
export const REEL_MUSIC_STORAGE_PREFIX = 'shared/reel-music/';

/**
 * "Create a Reel" — the single place goal/style/template/music options live,
 * mirroring config/verticals.ts's role for campaigns. The AI edit-plan
 * prompt (services/ai/reelPipeline.ts) and the renderer contract
 * (services/videoRenderer.ts) both read from here rather than hard-coding
 * these lists inline.
 */

export const REEL_GOALS: ReelGoal[] = [
  'food_showcase',
  'behind_the_scenes',
  'offer_promotion',
  'new_product',
  'local_attraction',
  'surprise_me',
];

export const REEL_STYLES: ReelStyle[] = ['fast_engaging', 'premium', 'local_fun', 'minimal', 'cinematic'];

export const REEL_DURATIONS: ReelDurationSeconds[] = [15, 30, 45];

export const MIN_REEL_CLIPS = 3;
export const MAX_REEL_CLIPS = 10;

// Cost-control ceilings (see AGENTS.md section 38 "COST CONTROL").
export const MAX_CLIP_DURATION_MS = 60_000; // 60s per raw clip
export const MAX_CLIP_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB per clip
export const MAX_TOTAL_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB total per reel project

export const MIN_SEGMENT_MS = 800;
export const MAX_SEGMENT_MS = 6000;
export const MAX_SEGMENT_TEXT_LENGTH = 60;
export const MAX_HOOK_TEXT_LENGTH = 80;

export const REEL_TRANSITIONS: ReelTransition[] = ['hard_cut', 'fade', 'dissolve', 'zoom_punch'];

export const REEL_TEMPLATES: ReelTemplateId[] = ['food_reveal', 'offer', 'behind_the_scenes'];

/**
 * Which template a goal defaults to when the AI doesn't have a strong
 * reason to pick otherwise (surprise_me lets the AI choose freely instead).
 */
export const GOAL_DEFAULT_TEMPLATE: Record<ReelGoal, ReelTemplateId> = {
  food_showcase: 'food_reveal',
  behind_the_scenes: 'behind_the_scenes',
  offer_promotion: 'offer',
  new_product: 'food_reveal',
  local_attraction: 'food_reveal',
  surprise_me: 'food_reveal',
};

/**
 * Style -> pacing/transition defaults the deterministic renderer applies.
 * The AI chooses text/clip selection; these deterministic knobs keep visual
 * quality consistent regardless of what the AI returns (see AGENTS.md
 * section 31 "TEMPLATE-DRIVEN EDITING").
 */
export const STYLE_TRANSITION_DEFAULTS: Record<ReelStyle, ReelTransition> = {
  fast_engaging: 'hard_cut',
  premium: 'fade',
  local_fun: 'zoom_punch',
  minimal: 'hard_cut',
  cinematic: 'dissolve',
};

export const STYLE_MUSIC_CATEGORY: Record<ReelStyle, ReelMusicTrack['category']> = {
  fast_engaging: 'energetic',
  premium: 'premium',
  local_fun: 'fun',
  minimal: 'minimal',
  cinematic: 'cinematic',
};

/**
 * MVP-controlled, licensed-for-use music library (see AGENTS.md section 22
 * "MUSIC" — never scrape/download third-party commercial tracks, never use
 * copyrighted commercial songs without documented rights). Each track's
 * file must be uploaded once to REEL_MUSIC_STORAGE_PREFIX as part of
 * deployment; the renderer resolves musicTrackId -> storagePath via this
 * table rather than the AI or a client ever supplying a path directly (see
 * getMusicTrackById below — the only way a storagePath reaches the
 * renderer is by looking one up here).
 *
 * MVP sourcing note: these 7 tracks are original instrumental beds
 * synthesized in-house (ffmpeg audio generators — sine/triangle oscillators
 * and percussive noise bursts, no samples, no third-party material), since
 * no interactively-licensable commercial music library (Epidemic Sound /
 * Artlist / Soundstripe, etc.) was available to source from in this
 * environment. Mitra owns them outright: zero licensing risk, zero
 * attribution burden on the businesses who post Reels using them. They are
 * intentionally simple/synthetic-sounding — replace with professionally
 * licensed or commissioned tracks (keeping this same metadata shape) before
 * wide public launch; see docs/ for the generation script.
 */
export const REEL_MUSIC_LIBRARY: ReelMusicTrack[] = [
  {
    id: 'energetic_01',
    name: 'Upbeat Local Market',
    category: 'energetic',
    mood: 'fast, punchy, percussive',
    durationSeconds: 45,
    bpm: 128,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.24,
    storagePath: 'shared/reel-music/energetic_01.mp3',
  },
  {
    id: 'premium_01',
    name: 'Smooth Ambience',
    category: 'premium',
    mood: 'slow, polished, warm',
    durationSeconds: 45,
    bpm: 92,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.18,
    storagePath: 'shared/reel-music/premium_01.mp3',
  },
  {
    id: 'fun_01',
    name: 'Local Groove',
    category: 'fun',
    mood: 'playful, conversational',
    durationSeconds: 45,
    bpm: 112,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.22,
    storagePath: 'shared/reel-music/fun_01.mp3',
  },
  {
    id: 'food_01',
    name: 'Kitchen Sizzle',
    category: 'food',
    mood: 'light, appetizing',
    durationSeconds: 45,
    bpm: 100,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.22,
    storagePath: 'shared/reel-music/food_01.mp3',
  },
  {
    id: 'cinematic_01',
    name: 'Slow Reveal',
    category: 'cinematic',
    mood: 'dramatic, building',
    durationSeconds: 45,
    bpm: 70,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.2,
    storagePath: 'shared/reel-music/cinematic_01.mp3',
  },
  {
    id: 'minimal_01',
    name: 'Quiet Counter',
    category: 'minimal',
    mood: 'sparse, calm, unobtrusive',
    durationSeconds: 45,
    bpm: 90,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.16,
    storagePath: 'shared/reel-music/minimal_01.mp3',
  },
  {
    id: 'offer_01',
    name: 'Limited Time',
    category: 'offer',
    mood: 'urgent, upbeat, promo-ready',
    durationSeconds: 45,
    bpm: 132,
    license: 'Mitra Original — owned outright by BrainWise/Mitra',
    source: 'In-house ffmpeg audio synthesis, 2026-09-16 (no samples, no third-party material)',
    attributionRequired: false,
    recommendedVolume: 0.24,
    storagePath: 'shared/reel-music/offer_01.mp3',
  },
];

export function getMusicTrackById(id: string): ReelMusicTrack | undefined {
  return REEL_MUSIC_LIBRARY.find((t) => t.id === id);
}

/**
 * Resolves the default track for a style, preferring an offer/promo track
 * when the Reel's goal is explicitly offer_promotion regardless of style
 * (a "premium" or "minimal" styled offer Reel still benefits from a
 * promo-flavored bed) — falls back to the style's usual category otherwise.
 */
export function pickDefaultMusicTrack(style: ReelStyle, goal?: ReelGoal): ReelMusicTrack {
  if (goal === 'offer_promotion') {
    const offerTrack = REEL_MUSIC_LIBRARY.find((t) => t.category === 'offer');
    if (offerTrack) return offerTrack;
  }
  const category = STYLE_MUSIC_CATEGORY[style];
  const track = REEL_MUSIC_LIBRARY.find((t) => t.category === category);
  // REEL_MUSIC_LIBRARY always has exactly one track per STYLE_MUSIC_CATEGORY
  // value above, so this fallback is unreachable in practice — kept only so
  // a future trimmed-down library can't throw here.
  return track ?? (REEL_MUSIC_LIBRARY[0] as ReelMusicTrack);
}
