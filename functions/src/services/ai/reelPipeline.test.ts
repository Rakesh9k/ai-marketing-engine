import { validateReelEditPlan, ReelEditPlanValidationError } from './reelPipeline';
import type { ReelClipAnalysis, ReelEditPlan } from '../../types';

function makeClip(overrides: Partial<ReelClipAnalysis> = {}): ReelClipAnalysis {
  return {
    clipId: 'clip_1',
    storagePath: 'businesses/b1/reels/r1/input/clip_1/video.mp4',
    durationMs: 8000,
    qualityScore: 0.8,
    relevanceScore: 0.8,
    sceneType: 'food',
    suggestedStartMs: 0,
    suggestedEndMs: 6000,
    description: 'Test clip',
    ...overrides,
  };
}

function makePlan(overrides: Partial<ReelEditPlan> = {}): ReelEditPlan {
  return {
    templateId: 'food_reveal',
    hook: { text: 'Craving something good?', durationMs: 3000 },
    segments: [
      { clipId: 'clip_1', startMs: 500, endMs: 3000, text: 'Fresh', transitionIn: 'hard_cut' },
      { clipId: 'clip_2', startMs: 0, endMs: 3500, text: 'Delicious', transitionIn: 'fade' },
    ],
    ending: { text: 'Order now', durationMs: 3000, cta: 'Order Now' },
    musicTrackId: 'food_01',
    totalDurationMs: 13000,
    ...overrides,
  };
}

describe('validateReelEditPlan', () => {
  const clips = [makeClip(), makeClip({ clipId: 'clip_2', suggestedEndMs: 5000 })];

  it('accepts a well-formed plan within the requested duration band', () => {
    const result = validateReelEditPlan(makePlan(), clips, 15);
    expect(result.segments).toHaveLength(2);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });

  it('rejects a plan referencing an unknown clipId', () => {
    const plan = makePlan({
      segments: [{ clipId: 'clip_999', startMs: 0, endMs: 2000, transitionIn: 'hard_cut' }],
    });
    expect(() => validateReelEditPlan(plan, clips, 15)).toThrow(ReelEditPlanValidationError);
  });

  it('clamps a segment endMs that exceeds the clip usable range', () => {
    const plan = makePlan({
      segments: [{ clipId: 'clip_1', startMs: 0, endMs: 999999, transitionIn: 'hard_cut' }],
    });
    const result = validateReelEditPlan(plan, clips, 15);
    expect(result.segments[0]!.endMs).toBeLessThanOrEqual(clips[0]!.suggestedEndMs);
  });

  it('rejects a segment that becomes non-positive duration after clamping', () => {
    const plan = makePlan({
      segments: [{ clipId: 'clip_1', startMs: 6000, endMs: 999999, transitionIn: 'hard_cut' }],
    });
    expect(() => validateReelEditPlan(plan, clips, 15)).toThrow(ReelEditPlanValidationError);
  });

  it('rejects a plan with no segments', () => {
    const plan = makePlan({ segments: [] });
    expect(() => validateReelEditPlan(plan, clips, 15)).toThrow(ReelEditPlanValidationError);
  });

  it('rejects a plan whose total duration is wildly off the requested duration', () => {
    const plan = makePlan({
      hook: { text: 'Hi', durationMs: 500 },
      segments: [{ clipId: 'clip_1', startMs: 0, endMs: 1000, transitionIn: 'hard_cut' }],
      ending: { text: 'Bye', durationMs: 500 },
    });
    // Requested 45s, plan totals ~2s — far outside the +/-40% band.
    expect(() => validateReelEditPlan(plan, clips, 45)).toThrow(ReelEditPlanValidationError);
  });

  it('accepts a plan within the +/-40% duration tolerance band', () => {
    const plan = makePlan({ totalDurationMs: 13000 });
    // Requested 15s (15000ms); plan sums to ~13s, well within tolerance.
    expect(() => validateReelEditPlan(plan, clips, 15)).not.toThrow();
  });
});
