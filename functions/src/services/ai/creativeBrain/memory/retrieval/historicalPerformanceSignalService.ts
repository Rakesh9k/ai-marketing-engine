import type {
  CreativeMemory,
  CreativeMemoryQuery,
  HistoricalPerformanceSignal,
} from "../../types/memory";

/**
 * Extracts historical performance signals for components matching a memory query context.
 */
export function extractHistoricalSignals(
  memories: CreativeMemory[],
  query: CreativeMemoryQuery
): HistoricalPerformanceSignal[] {
  const signals: HistoricalPerformanceSignal[] = [];

  for (const memory of memories) {
    if (memory.status !== "ACTIVE" && memory.status !== "HYPOTHESIS") {
      continue;
    }

    // Match industry context
    if (query.industry && memory.context.industry && memory.context.industry !== query.industry) {
      continue;
    }

    // Match objective context
    if (query.objective && memory.context.objective && memory.context.objective !== query.objective) {
      continue;
    }

    // Match platform context
    if (query.platform && memory.context.platform && memory.context.platform !== query.platform) {
      continue;
    }

    // Match minimum confidence requirement
    if (query.minimumConfidence) {
      const confLevels: Record<string, number> = {
        UNKNOWN: 0,
        HYPOTHESIS: 1,
        WEAK_EVIDENCE: 1,
        LOW: 1,
        MODERATE_EVIDENCE: 2,
        MEDIUM: 2,
        STRONG_EVIDENCE: 3,
        HIGH: 3,
        VALIDATED: 4,
      };
      const memConfScore = confLevels[memory.confidence] ?? 1;
      const minConfScore = confLevels[query.minimumConfidence] ?? 1;
      if (memConfScore < minConfScore) {
        continue;
      }
    }


    // Process each subject ID in the memory
    for (const componentId of memory.subjectIds) {
      const evidenceList = memory.performanceEvidence;
      if (evidenceList.length === 0) continue;

      const avgLift =
        evidenceList.reduce((sum, e) => sum + (e.relativeLift || 0), 0) / evidenceList.length;

      // Filter negative evidence unless requested
      if (avgLift < 0 && !query.includeNegativeEvidence) {
        continue;
      }

      const primaryMetric = evidenceList[0]?.metric || "relativePerformance";

      // Compute recency score based on latest evidence date
      const latestDate = Math.max(...evidenceList.map((e) => new Date(e.createdAt).getTime()));
      const daysOld = (Date.now() - latestDate) / (1000 * 60 * 60 * 24);
      const recency = Math.max(0.1, Math.min(1.0, 1.0 - daysOld / 90)); // Decays over 90 days

      signals.push({
        componentId,
        metric: primaryMetric,
        contextualLift: Number(avgLift.toFixed(4)),
        evidenceCount: evidenceList.length,
        confidence: memory.confidence,
        generalization: memory.generalization,
        recency: Number(recency.toFixed(4)),
      });
    }
  }

  return signals;
}
