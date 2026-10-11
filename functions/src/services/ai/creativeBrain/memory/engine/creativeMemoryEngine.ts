import type { ConfidenceLevel } from "../../types/enums";
import type {
  CreativeMemory,
  CreativeMemoryContext,
  CreativePerformance,
  LearningRelationship,
  PerformanceEvidence,
} from "../../types/memory";
import type { ID, ISODateTime } from "../../types/primitives";
import { calculateGeneralization } from "./generalizationCalculator";

/**
 * Builds or updates a CreativeMemory interpretation record from raw CreativePerformance evidence.
 * 
 * CRITICAL INVARIANT: Learning relationship defaults to "ASSOCIATED".
 * Never automatically upgrades to "CAUSALLY_SUPPORTED" without controlled experimental proof.
 */
export function buildCreativeMemory(
  evidenceList: CreativePerformance[],
  subjectType: CreativeMemory["subjectType"],
  subjectIds: ID[],
  tenantId?: ID
): CreativeMemory {
  const now: ISODateTime = new Date().toISOString();
  const memoryId: ID = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (evidenceList.length === 0) {
    return {
      memoryId,
      tenantId,
      subjectType,
      subjectIds,
      context: {},
      observation: "No performance evidence recorded for subject.",
      performanceEvidence: [],
      relationship: "ASSOCIATED" as LearningRelationship,
      confidence: "LOW" as ConfidenceLevel,
      generalization: calculateGeneralization([]),
      status: "HYPOTHESIS",
      createdAt: now,
      updatedAt: now,
    };
  }

  // 1. Build performance evidence items
  const performanceEvidence: PerformanceEvidence[] = [];
  for (const perf of evidenceList) {
    const relLifts = perf.relativePerformance || [];
    for (const rel of relLifts) {
      performanceEvidence.push({
        evidenceId: `ev_${perf.performanceId}_${rel.metric}`,
        creativeId: perf.creativeId,
        performanceId: perf.performanceId,
        source: perf.evidenceQuality ? "PLATFORM_API" : "MANUAL_ENTRY",
        metric: rel.metric,
        observedResult: rel.observedValue,
        benchmark: rel.benchmarkValue,
        relativeLift: rel.relativeLift,
        relationship: "ASSOCIATED" as LearningRelationship, // Hard invariant
        confidence: rel.confidence,
        context: {
          industry: perf.industry,
          location: perf.location,
          audience: perf.audience,
          audienceSituation: perf.audienceSituation,
          objective: perf.objective,
          platform: perf.platform,
          format: perf.format,
          mechanismIds: perf.mechanismIds,
          psychologyIds: perf.psychologyIds,
        },
        createdAt: perf.createdAt,
      });
    }
  }

  // 2. Synthesize context
  const primaryPerf = evidenceList[0];
  const context: CreativeMemoryContext = {
    industry: primaryPerf.industry,
    location: primaryPerf.location,
    audience: primaryPerf.audience,
    audienceSituation: primaryPerf.audienceSituation,
    objective: primaryPerf.objective,
    platform: primaryPerf.platform,
    format: primaryPerf.format,
    mechanismIds: primaryPerf.mechanismIds,
    psychologyIds: primaryPerf.psychologyIds,
  };

  // 3. Compute overall lift and observation string
  const avgLift =
    performanceEvidence.length > 0
      ? performanceEvidence.reduce((acc, curr) => acc + (curr.relativeLift || 0), 0) /
        performanceEvidence.length
      : 0;

  const liftPercent = (avgLift * 100).toFixed(1);
  const observation = `${subjectType} [${subjectIds.join(", ")}] is associated with ${
    avgLift >= 0 ? "+" : ""
  }${liftPercent}% average relative lift across ${evidenceList.length} performance observations in ${
    primaryPerf.industry
  } context.`;

  // 4. Calculate generalization across evidence
  const generalization = calculateGeneralization(evidenceList);

  // 5. Determine confidence level
  let confidence: ConfidenceLevel = "MEDIUM";
  if (evidenceList.length >= 5 && generalization.overall > 0.6) {
    confidence = "HIGH";
  } else if (evidenceList.length < 2) {
    confidence = "LOW";
  }

  // 6. Determine memory status
  const status = avgLift < -0.15 ? "INVALIDATED" : evidenceList.length >= 2 ? "ACTIVE" : "HYPOTHESIS";

  return {
    memoryId,
    tenantId: tenantId || primaryPerf.tenantId,
    subjectType,
    subjectIds,
    context,
    observation,
    performanceEvidence,
    relationship: "ASSOCIATED", // Always default to ASSOCIATED
    confidence,
    generalization,
    status,
    createdAt: now,
    updatedAt: now,
  };
}
