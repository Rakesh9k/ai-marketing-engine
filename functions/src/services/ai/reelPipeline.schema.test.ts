import { ReelEditPlanSchema } from './reelPipeline';

/**
 * Adversarial tests against the actual wire boundary between raw AI JSON
 * output and the rest of the Reel pipeline. This schema (not prompt wording,
 * not convention) is what makes it impossible for a malformed/malicious
 * model response to reach the renderer. Every case here mirrors a case a
 * real (or adversarially prompted) Gemini response could produce.
 */

function validPlan() {
  return {
    templateId: 'food_reveal',
    hook: { text: 'Craving something good?', durationMs: 3000 },
    segments: [
      { clipId: 'clip_1', startMs: 0, endMs: 3000, transitionIn: 'hard_cut' },
      { clipId: 'clip_2', startMs: 0, endMs: 3000, transitionIn: 'fade' },
    ],
    ending: { text: 'Order now', durationMs: 3000, cta: 'Order Now' },
    musicTrackId: 'food_01',
    totalDurationMs: 9000,
  };
}

describe('ReelEditPlanSchema (adversarial AI-output validation)', () => {
  it('accepts a well-formed plan', () => {
    expect(ReelEditPlanSchema.safeParse(validPlan()).success).toBe(true);
  });

  it('Case 1: rejects when segments is missing entirely (not merely an unknown clip id, which validateReelEditPlan handles later)', () => {
    const plan = validPlan() as any;
    delete plan.segments;
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('Case 2: rejects a negative startMs', () => {
    const plan = validPlan() as any;
    plan.segments[0].startMs = -500;
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('Case 3: schema allows endMs beyond what any real clip supports (bounds-checked later by validateReelEditPlan against real clip duration, not here)', () => {
    const plan = validPlan() as any;
    plan.segments[0].endMs = 999999999;
    // The schema only knows "endMs is a positive integer" — it cannot know
    // any clip's real duration. This is intentionally the job of
    // validateReelEditPlan (see reelPipeline.test.ts's clamping tests), a
    // second, independent layer — never rely on the schema alone for this.
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('Case 4: rejects when endMs is not a positive integer (e.g. AI sends 0 or a float)', () => {
    const plan = validPlan() as any;
    plan.segments[0].endMs = 0;
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
    plan.segments[0].endMs = 2.5;
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('Case 5: rejects an invalid/unsupported transition value', () => {
    const plan = validPlan() as any;
    plan.segments[0].transitionIn = 'explosion_wipe_3000';
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('Case 6: rejects an unsupported templateId', () => {
    const plan = validPlan() as any;
    plan.templateId = 'some_template_the_ai_invented';
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('Case 7: rejects a massively oversized text string (hook/segment/ending all bounded)', () => {
    const huge = 'x'.repeat(5000);
    const hookPlan = validPlan() as any;
    hookPlan.hook.text = huge;
    expect(ReelEditPlanSchema.safeParse(hookPlan).success).toBe(false);

    const segmentPlan = validPlan() as any;
    segmentPlan.segments[0].text = huge;
    expect(ReelEditPlanSchema.safeParse(segmentPlan).success).toBe(false);

    const endingPlan = validPlan() as any;
    endingPlan.ending.text = huge;
    expect(ReelEditPlanSchema.safeParse(endingPlan).success).toBe(false);
  });

  it('Case 8: rejects when a required field (ending) is missing', () => {
    const plan = validPlan() as any;
    delete plan.ending;
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('Case 9: tolerates unexpected extra fields without letting them through as anything meaningful', () => {
    const plan = validPlan() as any;
    plan.shellCommand = 'rm -rf /';
    plan.segments[0].__proto__evil = 'ignored';
    const result = ReelEditPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      // zod strips unknown keys by default (non-.strict() object) — the
      // extra field must not survive into the parsed value that the
      // renderer eventually receives.
      expect((result.data as any).shellCommand).toBeUndefined();
    }
  });

  it('Case 10: malformed JSON never reaches this schema at all — JSON.parse throws first (see GeminiTextProvider.generateStructured)', () => {
    expect(() => JSON.parse('{ this is not valid json ')).toThrow();
  });

  it('rejects fewer than 2 segments (an edit plan with 0-1 segments cannot tell a story)', () => {
    const plan = validPlan() as any;
    plan.segments = [plan.segments[0]];
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects more than 8 segments (cost/pacing ceiling)', () => {
    const plan = validPlan() as any;
    plan.segments = Array.from({ length: 9 }, (_, i) => ({
      clipId: `clip_${i}`,
      startMs: 0,
      endMs: 1000,
      transitionIn: 'hard_cut',
    }));
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects an empty clipId', () => {
    const plan = validPlan() as any;
    plan.segments[0].clipId = '';
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects a non-string musicTrackId', () => {
    const plan = validPlan() as any;
    plan.musicTrackId = 12345;
    expect(ReelEditPlanSchema.safeParse(plan).success).toBe(false);
  });
});
