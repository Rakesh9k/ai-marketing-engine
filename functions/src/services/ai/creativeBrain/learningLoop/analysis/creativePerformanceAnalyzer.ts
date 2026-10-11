import type {
  CreativeLearning,
  CreativeLineage,
  EvidenceReference,
  FailureLearning,
  LearningLifecycleStatus,
  LearningScope,
  MechanismCombinationLearning,
  NormalizedPerformanceEvidence,
} from "../../types/learningLoop";
import type { ISODateTime, Score } from "../../types/primitives";
import { ContextualBaselineService } from "./contextualBaselineService";

export interface AnalysisInput {
  lineageRecords: CreativeLineage[];
  evidenceRecords: NormalizedPerformanceEvidence[];
}

export interface AnalysisOutput {
  learnings: CreativeLearning[];
  failures: FailureLearning[];
  combinations: MechanismCombinationLearning[];
}

/**
 * Deterministic Creative Performance Analyzer.
 * Analyzes normalized performance evidence against creative lineage attribution to detect
 * positive patterns, negative failure patterns, and mechanism combination effects.
 */
export class CreativePerformanceAnalyzer {
  private baselineService = new ContextualBaselineService();

  /**
   * Calculates deterministic confidence score.
   */
  calculateConfidence(
    sampleSize: number,
    relativeLift: number,
    consistency: number,
    contextMatch: number,
    repeatability: number,
    dataQuality: number
  ): Score {
    const sampleScore = Math.min(1.0, sampleSize / 10);
    const liftScore = Math.min(1.0, Math.max(0.0, 0.5 + relativeLift * 0.5));
    const consistencyScore = Math.min(1.0, Math.max(0.0, consistency));
    const contextMatchScore = Math.min(1.0, Math.max(0.0, contextMatch));
    const repeatabilityScore = Math.min(1.0, Math.max(0.0, repeatability));
    const dataQualityScore = Math.min(1.0, Math.max(0.0, dataQuality));

    const confidence =
      sampleScore * 0.2 +
      liftScore * 0.2 +
      consistencyScore * 0.2 +
      contextMatchScore * 0.15 +
      repeatabilityScore * 0.15 +
      dataQualityScore * 0.1;

    return Number(confidence.toFixed(4));
  }

  /**
   * Main analysis execution.
   */
  analyze(input: AnalysisInput): AnalysisOutput {
    const now: ISODateTime = new Date().toISOString();
    const learnings: CreativeLearning[] = [];
    const failures: FailureLearning[] = [];
    const combinations: MechanismCombinationLearning[] = [];

    // Map evidence by campaignId
    const evidenceMap = new Map<string, NormalizedPerformanceEvidence>();
    for (const ev of input.evidenceRecords) {
      evidenceMap.set(ev.campaignId, ev);
    }

    // Group lineage and evidence by mechanismId
    const mechanismGroups = new Map<
      string,
      Array<{ lineage: CreativeLineage; evidence: NormalizedPerformanceEvidence }>
    >();

    for (const lineage of input.lineageRecords) {
      const ev = evidenceMap.get(lineage.campaignId);
      if (!ev) continue;

      for (const mechId of lineage.mechanismIds) {
        if (!mechanismGroups.has(mechId)) {
          mechanismGroups.set(mechId, []);
        }
        mechanismGroups.get(mechId)!.push({ lineage, evidence: ev });
      }
    }

    // 1. Analyze single mechanisms for Positive and Failure Patterns
    for (const [mechId, pairs] of mechanismGroups.entries()) {
      if (pairs.length === 0) continue;

      const sampleSize = pairs.length;
      const primaryPair = pairs[0];
      const industry = primaryPair.lineage.industry;
      const objective = primaryPair.lineage.objective;
      const platform = primaryPair.lineage.platform;

      // Select target metric based on objective
      let targetMetric: keyof NormalizedPerformanceEvidence = "ctr";
      const objStr = String(objective);
      if (objStr === "LEAD_GENERATION") targetMetric = "conversionRate";
      else if (objStr === "ENGAGEMENT") targetMetric = "engagementRate";
      else if (objStr === "SALES" || objStr === "CONVERSION") targetMetric = "conversionRate";


      // Calculate baseline and relative lifts
      const baseline = this.baselineService.calculateBaseline(input.evidenceRecords, targetMetric, {
        industry: String(industry),
        objective: String(objective),
        platform: String(platform),
      });

      const lifts: number[] = [];
      const evidenceRefs: EvidenceReference[] = [];

      for (const pair of pairs) {
        const val = pair.evidence[targetMetric];
        if (typeof val === "number") {
          const lift = this.baselineService.calculateRelativeLift(val, baseline.baselineValue);
          lifts.push(lift);
          evidenceRefs.push({
            evidenceId: pair.evidence.evidenceId,
            campaignId: pair.lineage.campaignId,
            tenantId: pair.lineage.tenantId,
            observedLift: lift,
            metric: targetMetric as string,
            confidence: sampleSize >= 5 ? "HIGH" : "MEDIUM",
            collectedAt: pair.evidence.collectedAt,
          });
        }
      }

      if (lifts.length === 0) continue;

      const avgLift = lifts.reduce((sum, l) => sum + l, 0) / lifts.length;
      const positiveCount = lifts.filter((l) => l > 0).length;
      const consistency = positiveCount / lifts.length;

      const confidenceScore = this.calculateConfidence(
        sampleSize,
        avgLift,
        consistency,
        0.85,
        consistency,
        0.9
      );

      // Determine scope
      let scope: LearningScope = "INDUSTRY";
      if (pairs.every((p) => p.lineage.tenantId === primaryPair.lineage.tenantId)) {
        scope = "TENANT";
      } else if (pairs.length >= 10 && consistency > 0.8) {
        scope = "GLOBAL";
      }

      // POSITIVE PATTERN
      if (avgLift >= 0.05) {
        const status: LearningLifecycleStatus =
          sampleSize >= 5 && confidenceScore >= 0.7 ? "VALIDATED" : "EMERGING";

        learnings.push({
          learningId: `learn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tenantId: scope === "TENANT" ? primaryPair.lineage.tenantId : undefined,
          scope,
          mechanismId: mechId,
          learningType: "PERFORMANCE_PATTERN",
          observation: `Mechanism [${mechId}] achieved +${(avgLift * 100).toFixed(
            1
          )}% relative lift in ${targetMetric} across ${sampleSize} campaigns.`,
          hypothesis: `Mechanism [${mechId}] aligns with target audience motivations in ${industry} context.`,
          insight: `High engagement observed for [${mechId}] when deployed for ${objective} on ${platform}.`,
          recommendation: `Prioritize mechanism [${mechId}] for future ${objective} campaigns in ${industry}.`,
          supportingEvidence: evidenceRefs,
          sampleSize,
          confidenceScore,
          evidenceStrength: confidenceScore > 0.8 ? "STRONG" : "EMERGING",
          relativeLift: Number(avgLift.toFixed(4)),
          status,
          context: {
            industry,
            objective,
            platform,
            format: primaryPair.lineage.executionFormat,
          },
          firstObservedAt: pairs[0].evidence.collectedAt,
          lastObservedAt: pairs[pairs.length - 1].evidence.collectedAt,
          lastValidatedAt: status === "VALIDATED" ? now : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }

      // NEGATIVE FAILURE PATTERN
      if (avgLift <= -0.15 && consistency <= 0.3) {
        failures.push({
          failureId: `fail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tenantId: scope === "TENANT" ? primaryPair.lineage.tenantId : undefined,
          scope,
          mechanismId: mechId,
          avoidContext: {
            industry,
            objective,
          },
          observedNegativeOutcome: `Repeated negative lift (${(avgLift * 100).toFixed(
            1
          )}%) in ${targetMetric}.`,
          reason: `Mechanism [${mechId}] generates friction or misalignment for ${objective} in ${industry}.`,
          recommendedAlternatives: [],
          confidenceScore,
          evidenceCount: sampleSize,
          createdAt: now,
        });
      }
    }

    // 2. Analyze Combination Effects (Mechanism A + Mechanism B)
    const comboMap = new Map<
      string,
      Array<{ lineage: CreativeLineage; evidence: NormalizedPerformanceEvidence }>
    >();

    for (const lineage of input.lineageRecords) {
      const ev = evidenceMap.get(lineage.campaignId);
      if (!ev || lineage.mechanismIds.length < 2) continue;

      const sortedMechs = [...lineage.mechanismIds].sort();
      for (let i = 0; i < sortedMechs.length; i++) {
        for (let j = i + 1; j < sortedMechs.length; j++) {
          const comboKey = `${sortedMechs[i]}__${sortedMechs[j]}`;
          if (!comboMap.has(comboKey)) {
            comboMap.set(comboKey, []);
          }
          comboMap.get(comboKey)!.push({ lineage, evidence: ev });
        }
      }
    }

    for (const [comboKey, pairs] of comboMap.entries()) {
      if (pairs.length < 2) continue;

      const [mechA, mechB] = comboKey.split("__");
      const sampleSize = pairs.length;
      const primaryPair = pairs[0];

      const baseline = this.baselineService.calculateBaseline(input.evidenceRecords, "ctr", {
        industry: String(primaryPair.lineage.industry),
        objective: String(primaryPair.lineage.objective),
      });

      const lifts = pairs
        .map((p) => p.evidence.ctr)
        .filter((v): v is number => typeof v === "number")
        .map((v) => this.baselineService.calculateRelativeLift(v, baseline.baselineValue));

      if (lifts.length === 0) continue;
      const combinedLift = lifts.reduce((a, b) => a + b, 0) / lifts.length;

      if (combinedLift > 0.1) {
        combinations.push({
          combinationId: `combo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tenantId: primaryPair.lineage.tenantId,
          scope: "INDUSTRY",
          primaryMechanismId: mechA,
          secondaryMechanismId: mechB,
          combinedLift: Number(combinedLift.toFixed(4)),
          individualLifts: { [mechA]: 0.1, [mechB]: 0.1 },
          synergyMultiplier: Number((combinedLift / 0.2).toFixed(2)),
          context: {
            industry: primaryPair.lineage.industry,
            objective: primaryPair.lineage.objective,
            platform: primaryPair.lineage.platform,
          },
          sampleSize,
          confidenceScore: this.calculateConfidence(sampleSize, combinedLift, 0.8, 0.8, 0.8, 0.9),
          status: sampleSize >= 3 ? "VALIDATED" : "EMERGING",
          createdAt: now,
        });
      }
    }

    return { learnings, failures, combinations };
  }
}
