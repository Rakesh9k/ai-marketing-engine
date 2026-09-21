import { z } from 'zod';
import { generateStructuredText, classifyReelClipThumbnails } from './index';
import { getVideoRenderer } from '../videoRenderer';
import {
  GOAL_DEFAULT_TEMPLATE,
  MAX_HOOK_TEXT_LENGTH,
  MAX_SEGMENT_MS,
  MAX_SEGMENT_TEXT_LENGTH,
  MIN_SEGMENT_MS,
  REEL_MUSIC_LIBRARY,
  REEL_TEMPLATES,
  REEL_TRANSITIONS,
  STYLE_TRANSITION_DEFAULTS,
  getMusicTrackById,
  pickDefaultMusicTrack,
} from '../../config/reels';
import type {
  Business,
  BrandKit,
  ReelClipAnalysis,
  ReelDurationSeconds,
  ReelEditPlan,
  ReelGoal,
  ReelStyle,
} from '../../types';

/**
 * Stage A — Analyze clips. Combines the renderer's deterministic ffprobe
 * facts (duration/brightness/motion — see videoRenderer.ts) with a single
 * batched Vision AI scene classification of each clip's extracted
 * thumbnail. Never one Vision call per clip.
 */
export async function analyzeReelClips(
  clips: Array<{ clipId: string; storagePath: string }>,
  business: Pick<Business, 'name' | 'category'>,
  goal: ReelGoal,
  resolveThumbnailUrl: (storagePath: string) => Promise<string>
): Promise<ReelClipAnalysis[]> {
  const renderer = getVideoRenderer();

  const deterministic = await Promise.all(
    clips.map((clip) => renderer.analyzeClip({ clipId: clip.clipId, storagePath: clip.storagePath }))
  );

  const withThumbnailUrls = await Promise.all(
    deterministic.map(async (d) => ({
      clipId: d.clipId,
      thumbnailUrl: await resolveThumbnailUrl(d.thumbnailStoragePath),
    }))
  );

  const classification = await classifyReelClipThumbnails(withThumbnailUrls, {
    name: business.name,
    category: business.category,
    goal,
  });

  const byClipId = new Map(classification.classifications.map((c) => [c.clipId, c]));

  return deterministic.map((d) => {
    const cls = byClipId.get(d.clipId);
    // A deterministic, non-AI-dependent quality score: brightness and
    // motion both matter (a static or very dark clip is unusable even if
    // Vision AI liked its content) — see AGENTS.md section 28 "avoid
    // extremely shaky footage... extremely dark footage... long static
    // sections".
    const qualityScore = Math.min(1, (d.brightnessScore + d.motionScore) / 2);
    const usableMs = Math.min(d.durationMs, MAX_SEGMENT_MS * 1.5);
    return {
      clipId: d.clipId,
      storagePath: clips.find((c) => c.clipId === d.clipId)!.storagePath,
      durationMs: d.durationMs,
      qualityScore,
      relevanceScore: cls?.relevanceScore ?? 0.3,
      sceneType: cls?.sceneType ?? 'unknown',
      suggestedStartMs: 0,
      suggestedEndMs: usableMs,
      description: cls?.description ?? 'Unclassified clip',
    };
  });
}

// Exported for direct adversarial schema testing (see reelPipeline.test.ts) —
// this schema is the actual security boundary between raw AI JSON output and
// anything downstream ever trusting it (AGENTS.md section 13 "never render
// arbitrary unvalidated AI output").
export const ReelEditPlanSchema = z.object({
  templateId: z.enum(REEL_TEMPLATES as [string, ...string[]]),
  hook: z.object({
    text: z.string().min(1).max(MAX_HOOK_TEXT_LENGTH),
    durationMs: z.number().int().positive(),
  }),
  segments: z
    .array(
      z.object({
        clipId: z.string().min(1),
        startMs: z.number().int().min(0),
        endMs: z.number().int().positive(),
        text: z.string().max(MAX_SEGMENT_TEXT_LENGTH).optional(),
        transitionIn: z.enum(REEL_TRANSITIONS as [string, ...string[]]),
      })
    )
    .min(2)
    .max(8),
  offer: z
    .object({ text: z.string().min(1).max(MAX_SEGMENT_TEXT_LENGTH), durationMs: z.number().int().positive() })
    .optional(),
  ending: z.object({
    text: z.string().min(1).max(MAX_SEGMENT_TEXT_LENGTH),
    durationMs: z.number().int().positive(),
    cta: z.string().max(40).optional(),
    whatsapp: z.string().max(20).optional(),
    location: z.string().max(60).optional(),
  }),
  musicTrackId: z.string().min(1),
  totalDurationMs: z.number().int().positive(),
});

export class ReelEditPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReelEditPlanValidationError';
  }
}

interface BuildPromptInput {
  business: Business;
  brandKit: BrandKit | null;
  goal: ReelGoal;
  style: ReelStyle;
  durationSeconds: ReelDurationSeconds;
  offer?: string;
  cta?: string;
  additionalMessage?: string;
  clipAnalyses: ReelClipAnalysis[];
}

/**
 * Stage B — Build the Reel story. The prompt is deliberately explicit about
 * never inventing facts (AGENTS.md section 39/40) — only business-supplied
 * offer/CTA/WhatsApp fields may appear in the plan; the model is never given
 * a price, phone number, or offer it wasn't handed here.
 */
export function buildReelEditPlanPrompt(input: BuildPromptInput): string {
  const { business, goal, style, durationSeconds, offer, cta, additionalMessage, clipAnalyses } = input;
  const defaultTemplate = GOAL_DEFAULT_TEMPLATE[goal];
  const defaultTransition = STYLE_TRANSITION_DEFAULTS[style];
  const music = pickDefaultMusicTrack(style, goal);
  const language = business.businessBrain?.localization?.primaryLanguage ?? 'en';
  const regionalStyle = business.businessBrain?.localization?.regionalStyle ?? 'neutral';
  const whatsapp = business.contact?.whatsapp;
  const locationText = [business.location?.locality, business.location?.city]
    .filter(Boolean)
    .join(', ');

  return `You are Mitra's short-form social video editor. Your job is to select the strongest moments from user-provided footage and create a structured editing plan for a short vertical social Reel.

Priorities, in order: visual quality, clear story, strong opening hook, variety between clips, appropriate pacing, business relevance, local context where configured, accurate business information, clear CTA, natural language.

Never invent prices, offers, locations, phone numbers, claims, ingredients, product features, or business facts. Use ONLY the facts given below. If a fact (offer/CTA/WhatsApp) is not given, do not mention it.

BUSINESS: ${business.name} (${business.category})
LOCATION: ${locationText || 'not provided'}
LANGUAGE: ${language} (regional style: ${regionalStyle})
WHATSAPP: ${whatsapp || 'not provided - do not produce a WhatsApp CTA'}
REEL GOAL: ${goal}
REEL STYLE: ${style} (default transition for this style: "${defaultTransition}")
TARGET DURATION: ${durationSeconds} seconds (${durationSeconds * 1000}ms) total, hook + segments + ending
OFFER (only mention if present): ${offer || 'none provided'}
CTA TEXT (only use if present, otherwise write a generic natural CTA like "Order now" only if it matches the goal): ${cta || 'none provided'}
ADDITIONAL MESSAGE: ${additionalMessage || 'none'}
DEFAULT TEMPLATE FOR THIS GOAL: ${defaultTemplate} (you may choose a different one from: ${REEL_TEMPLATES.join(', ')} if the footage genuinely fits better)
MUSIC TRACK TO USE: "${music.id}" (style-matched, do not invent a different musicTrackId)

AVAILABLE CLIPS (choose the best subset, order them into a story - do not use every clip if some are weak):
${clipAnalyses
  .map(
    (c) =>
      `- clipId="${c.clipId}": duration=${c.durationMs}ms, quality=${c.qualityScore.toFixed(2)}, relevance=${c.relevanceScore.toFixed(2)}, scene=${c.sceneType}, usable range 0-${c.suggestedEndMs}ms, description="${c.description}"`
  )
  .join('\n')}

Rules:
- Use only the clipIds listed above. Never invent a clipId.
- Each segment's startMs/endMs must fall within that clip's usable range (0 to the given usable-range end).
- Each segment must be between ${MIN_SEGMENT_MS}ms and ${MAX_SEGMENT_MS}ms long (endMs - startMs).
- Prefer 3-6 segments. Favor clear, high quality/relevance clips; skip low-quality or duplicate-feeling ones.
- hook.durationMs + sum of all segment durations + (offer.durationMs if present) + ending.durationMs should be close to the target duration (within a few seconds).
- Only include "offer" if OFFER above is non-empty. Only include ending.cta if CTA is non-empty. Only include ending.whatsapp if WHATSAPP above is provided.
- Text fields must be short, natural, and in the business's configured language/regional style - not generic marketing clichés.

Return JSON matching exactly this shape:
{
  "templateId": "food_reveal|offer|behind_the_scenes",
  "hook": { "text": "string", "durationMs": number },
  "segments": [ { "clipId": "string", "startMs": number, "endMs": number, "text": "string (optional)", "transitionIn": "hard_cut|fade|dissolve|zoom_punch" } ],
  "offer": { "text": "string", "durationMs": number } (omit entirely if no offer),
  "ending": { "text": "string", "durationMs": number, "cta": "string (optional)", "whatsapp": "string (optional)", "location": "string (optional)" },
  "musicTrackId": "string",
  "totalDurationMs": number
}`;
}

export async function generateReelEditPlan(input: BuildPromptInput): Promise<ReelEditPlan> {
  const prompt = buildReelEditPlanPrompt(input);
  const raw = await generateStructuredText(prompt, ReelEditPlanSchema, { temperature: 0.5 });
  return validateReelEditPlan(raw as ReelEditPlan, input.clipAnalyses, input.durationSeconds);
}

/**
 * Never render arbitrary unvalidated AI output (AGENTS.md section 13). This
 * re-checks everything the zod schema above cannot express: that clip IDs
 * actually exist in the provided analyses, timestamps fall within each
 * clip's real duration, start < end, and the total duration is within a
 * reasonable band of what was requested. Performs a safe deterministic
 * repair (clamping) where possible rather than failing outright, since a
 * slightly-off AI plan is still usable footage-wise.
 */
export function validateReelEditPlan(
  plan: ReelEditPlan,
  clipAnalyses: ReelClipAnalysis[],
  durationSeconds: ReelDurationSeconds
): ReelEditPlan {
  const clipsById = new Map(clipAnalyses.map((c) => [c.clipId, c]));

  if (plan.segments.length === 0) {
    throw new ReelEditPlanValidationError('Edit plan has no segments');
  }

  const repairedSegments = plan.segments.map((segment) => {
    const clip = clipsById.get(segment.clipId);
    if (!clip) {
      throw new ReelEditPlanValidationError(`Edit plan references unknown clipId "${segment.clipId}"`);
    }
    let { startMs, endMs } = segment;
    if (startMs < 0) startMs = 0;
    if (endMs > clip.suggestedEndMs) endMs = clip.suggestedEndMs;
    if (endMs <= startMs) {
      throw new ReelEditPlanValidationError(
        `Segment for clip "${segment.clipId}" has non-positive duration after clamping`
      );
    }
    let duration = endMs - startMs;
    if (duration < MIN_SEGMENT_MS) {
      endMs = Math.min(clip.suggestedEndMs, startMs + MIN_SEGMENT_MS);
      duration = endMs - startMs;
      if (duration < MIN_SEGMENT_MS / 2) {
        throw new ReelEditPlanValidationError(
          `Segment for clip "${segment.clipId}" is too short even after repair`
        );
      }
    }
    if (duration > MAX_SEGMENT_MS) {
      endMs = startMs + MAX_SEGMENT_MS;
    }
    return { ...segment, startMs, endMs };
  });

  const totalMs =
    plan.hook.durationMs +
    repairedSegments.reduce((sum, s) => sum + (s.endMs - s.startMs), 0) +
    (plan.offer?.durationMs ?? 0) +
    plan.ending.durationMs;

  const targetMs = durationSeconds * 1000;
  // Allow a generous +/-40% band rather than an exact match: the AI cannot
  // predict repair-driven clamping above, and a Reel a few seconds off the
  // requested duration is still a usable, postable output. Reject only a
  // plan that is wildly off (e.g. a 5s or 90s "30 second" Reel).
  if (totalMs < targetMs * 0.6 || totalMs > targetMs * 1.4) {
    throw new ReelEditPlanValidationError(
      `Edit plan total duration ${totalMs}ms is too far from the requested ${targetMs}ms`
    );
  }

  return { ...plan, segments: repairedSegments, totalDurationMs: totalMs } as ReelEditPlan;
}

/**
 * Orchestrates Stage B with the "repair once, regenerate once, else fail"
 * policy from AGENTS.md section 13.
 */
export async function generateValidatedReelEditPlan(input: BuildPromptInput): Promise<ReelEditPlan> {
  try {
    return await generateReelEditPlan(input);
  } catch (firstError) {
    try {
      return await generateReelEditPlan(input);
    } catch (secondError) {
      throw new ReelEditPlanValidationError(
        `Mitra couldn't build a valid edit plan after two attempts: ${
          secondError instanceof Error ? secondError.message : String(secondError)
        }`
      );
    }
  }
}
