import type { CreativeNoveltySignal } from "../../types/memory";
import type { ID } from "../../types/primitives";
import type { Score } from "../../types/primitives";

/**
 * Calculates creative novelty and audience fatigue decay signals.
 * Frequent recent usage of a creative component degrades its novelty score.
 */
export function calculateNoveltySignal(
  componentId: ID,
  usageHistory: { totalCount: number; recent14DayCount: number }
): CreativeNoveltySignal {
  const { totalCount, recent14DayCount } = usageHistory;

  // Novelty decays rapidly with high recent usage
  // 0 recent uses = 1.0 novelty score
  // 1 recent use = 0.85
  // 3 recent uses = 0.55
  // 5+ recent uses = 0.20 (fatigued)
  let noveltyScore: Score = 1.0;
  if (recent14DayCount >= 5) {
    noveltyScore = 0.2;
  } else if (recent14DayCount >= 3) {
    noveltyScore = 0.55;
  } else if (recent14DayCount >= 1) {
    noveltyScore = 0.85;
  }

  // Slight penalty for overall historical repetition (over-satiation)
  if (totalCount > 10) {
    noveltyScore = Math.max(0.1, noveltyScore * 0.9);
  }

  const performanceDecay: Score = Number((1.0 - noveltyScore).toFixed(4));

  return {
    componentId,
    repetitionCount: totalCount,
    recentUseCount: recent14DayCount,
    performanceDecay,
    noveltyScore: Number(noveltyScore.toFixed(4)),
  };
}
