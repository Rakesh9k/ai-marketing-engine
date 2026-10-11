/**
 * PHASE 10.40 — Platform & Format Test Fixtures
 * Channel constraints, aspect ratios, and format requirements.
 */

export type PlatformChannel = "INSTAGRAM" | "FACEBOOK" | "WHATSAPP" | "GOOGLE_BUSINESS_PROFILE" | "PRINT";

export type CreativeFormatType = "STATIC_POST" | "CAROUSEL" | "REEL" | "STORY" | "TEXT_MESSAGE";

export interface TestPlatformContext {
  channel: PlatformChannel;
  format: CreativeFormatType;
  maxCopyLengthWords?: number;
  allowedVisualStructures: string[];
  requiresDirectResponseCTA: boolean;
}

export const FIXTURE_INSTAGRAM_STORY: TestPlatformContext = {
  channel: "INSTAGRAM",
  format: "STORY",
  maxCopyLengthWords: 25,
  allowedVisualStructures: [
    "visual_text_overlay_hook_banner",
    "visual_macro_extreme_close_up",
    "visual_mirror_reflection_shot",
    "visual_first_person_pov_framing",
    "visual_dark_mode_neon_accent",
  ],
  requiresDirectResponseCTA: true,
};

export const FIXTURE_INSTAGRAM_FEED_CAROUSEL: TestPlatformContext = {
  channel: "INSTAGRAM",
  format: "CAROUSEL",
  maxCopyLengthWords: 150,
  allowedVisualStructures: [
    "visual_step_1_2_3_numbered_grid",
    "visual_infographic_split_callout",
    "visual_overhead_flatlay_arrangement",
    "visual_wide_architectural_panoramic",
  ],
  requiresDirectResponseCTA: false,
};

export const FIXTURE_WHATSAPP_DIRECT: TestPlatformContext = {
  channel: "WHATSAPP",
  format: "TEXT_MESSAGE",
  maxCopyLengthWords: 80,
  allowedVisualStructures: [
    "visual_text_overlay_hook_banner",
    "visual_step_1_2_3_numbered_grid",
  ],
  requiresDirectResponseCTA: true,
};
