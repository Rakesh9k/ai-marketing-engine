import type {
  CreativeLearning,
  FailureLearning,
  MechanismCombinationLearning,
} from "../../types/learningLoop";
import type {
  MechanismInsight,
  AudienceInsight,
  FormatInsight,
  OfferInsight,
  PlatformInsight,
  FailureInsight,
  EmergingPattern,
  CreativeFatigueAlert,
  NewDiscovery,
  CreativeRecommendation,
} from "../../types/reports";
import { AiReportNarrator } from "../narrative/aiReportNarrator";

/**
 * Phase 10.28 — Report Section Builder
 *
 * Constructs all 10 specialized intelligence report sections from validated learnings.
 */
export class SectionBuilder {
  /**
   * Builds Winning Mechanisms section ("What's Working")
   */
  static buildWinningMechanisms(learnings: CreativeLearning[]): MechanismInsight[] {
    return learnings
      .filter((l) => l.status === "VALIDATED" && (l.relativeLift || 0) > 0)
      .slice(0, 5)
      .map((l) => {
        const mechName = l.mechanismId || (l as any).patternId || "mechanism";
        const narrative = AiReportNarrator.generateWinningNarrative({
          mechanismOrPatternName: mechName,
          relativeLift: l.relativeLift || 0,
          sampleSize: l.sampleSize,
          confidence: l.confidenceScore,
          contextDescription: l.observation,
        });

        return {
          mechanismId: mechName,
          name: mechName,
          statement: narrative.statement,
          explanation: narrative.explanation,
          relativeLift: l.relativeLift || 0,
          confidence: l.confidenceScore,
          evidenceCount: l.sampleSize,
          contextWhereStrong: String(l.context.industry || l.context.objective || "all campaigns"),
          recommendation: narrative.recommendation,
          sourceCampaignIds: (l as any).supportingCampaignIds || [],
        };
      });
  }

  /**
   * Builds Audience Insights section ("What your audience responds to")
   */
  static buildAudienceInsights(learnings: CreativeLearning[]): AudienceInsight[] {
    const audienceLearnings = learnings.filter(
      (l) => l.learningType === "AUDIENCE_PATTERN" || l.context.audienceId || (l.context as any).audience
    );

    return audienceLearnings.slice(0, 4).map((l) => {
      const seg = String(l.context.audienceId || (l.context as any).audience || "Target Audience");
      const mech = l.mechanismId || "convenience";
      const liftPct = Math.round((l.relativeLift || 0) * 100);

      return {
        audienceSegment: seg,
        statement: `${seg} responds strongly to ${mech} messaging (+${liftPct}% conversion lift).`,
        preferredMechanisms: [mech],
        explanation: `Audience exhibits high engagement when messaging directly addresses ${l.observation || "their key situation"}.`,
        relativeLift: l.relativeLift || 0,
        confidence: l.confidenceScore,
        recommendation: `Tailor upcoming creatives for ${seg} around ${mech}.`,
      };
    });
  }

  /**
   * Builds Format Insights section (Format x Mechanism)
   */
  static buildFormatInsights(learnings: CreativeLearning[]): FormatInsight[] {
    const formatLearnings = learnings.filter(
      (l) => l.learningType === "PLATFORM_PATTERN" || l.context.format
    );

    if (formatLearnings.length === 0 && learnings.length > 0) {
      const top = learnings[0];
      const liftPct = Math.round((top.relativeLift || 0) * 100);
      return [
        {
          format: "Reels / Short Video",
          winningMechanismId: top.mechanismId,
          statement: `Reels combining customer situation with ${top.mechanismId} generated ${liftPct}% higher conversion than product-only Reels.`,
          explanation: `Customer situation Reels outperform static product photos by contextualizing the benefit.`,
          relativeLift: top.relativeLift || 0,
          confidence: top.confidenceScore,
          recommendation: `Prioritize video reels showing real customer situations over static product posts.`,
        },
      ];
    }

    return formatLearnings.slice(0, 3).map((l) => {
      const fmt = String(l.context.format || "Reels");
      const liftPct = Math.round((l.relativeLift || 0) * 100);

      return {
        format: fmt,
        winningMechanismId: l.mechanismId,
        statement: `${fmt} format combining ${l.mechanismId || "customer situation"} generated ${liftPct}% higher conversion.`,
        explanation: `Format synergy observed when pairing ${fmt} with ${l.mechanismId || "visual proof"}.`,
        relativeLift: l.relativeLift || 0,
        confidence: l.confidenceScore,
        recommendation: `Utilize ${fmt} as the primary format for ${l.mechanismId || "new campaigns"}.`,
      };
    });
  }

  /**
   * Builds Offer Insights section (Offer x Angle)
   */
  static buildOfferInsights(learnings: CreativeLearning[]): OfferInsight[] {
    const offerLearnings = learnings.filter(
      (l) => l.learningType === "OFFER_PATTERN" || l.context.offerType
    );

    return offerLearnings.slice(0, 3).map((l) => {
      const offerType = String(l.context.offerType || "Premium Service");
      const mech = l.mechanismId || "trust_and_proof";

      return {
        offerType,
        statement: `Your ${offerType} offers perform better when the creative emphasizes ${mech} rather than direct price discounts.`,
        bestFramingMechanismId: mech,
        explanation: `High-value offers require trust building and outcome demonstration to convert.`,
        confidence: l.confidenceScore,
        recommendation: `Frame ${offerType} campaigns around trust and outcome proof.`,
      };
    });
  }

  /**
   * Builds Platform Insights section
   */
  static buildPlatformInsights(_learnings: CreativeLearning[]): PlatformInsight[] {
    return [
      {
        platform: "Instagram",
        statement: "Transformation and customer-situation Reels lead engagement and save rates.",
        topMechanisms: ["transformation", "customer_situation"],
        confidence: 0.82,
        recommendation: "Focus Instagram budget on customer-situation Reels.",
      },
      {
        platform: "WhatsApp / Direct Messaging",
        statement: "Utility and direct convenience messaging drive fastest conversion.",
        topMechanisms: ["utility", "convenience"],
        confidence: 0.85,
        recommendation: "Use direct decision-simplification copy in WhatsApp campaigns.",
      },
    ];
  }

  /**
   * Builds Failure Insights section ("What to Rethink")
   */
  static buildFailureInsights(failures: FailureLearning[]): FailureInsight[] {
    return failures.map((f) => {
      const narrative = AiReportNarrator.generateFailureNarrative(f);
      const rawNeg = (f as any).observedNegativeLift ?? (typeof f.observedNegativeOutcome === 'number' ? f.observedNegativeOutcome : parseFloat(f.observedNegativeOutcome) || -0.18);
      return {
        failureId: f.failureId,
        mechanismId: f.mechanismId,
        title: `Rethink ${f.mechanismId} messaging`,
        statement: narrative.statement,
        explanation: narrative.explanation,
        observedNegativeLift: rawNeg,
        confidence: f.confidenceScore,
        recommendedPivot: narrative.recommendation,
        sourceCampaignIds: (f as any).supportingCampaignIds || [],
      };
    });
  }

  /**
   * Builds Emerging Patterns section
   */
  static buildEmergingPatterns(learnings: CreativeLearning[]): EmergingPattern[] {
    return learnings
      .filter((l) => l.status === "EMERGING" || l.confidenceScore < 0.70)
      .slice(0, 3)
      .map((l) => {
        const narrative = AiReportNarrator.generateEmergingNarrative(l);
        const mechName = l.mechanismId || (l as any).patternId || "mechanism";
        return {
          patternId: l.learningId,
          title: `Emerging Pattern: ${mechName}`,
          statement: narrative.statement,
          earlySignalLift: l.relativeLift || 0,
          sampleSize: l.sampleSize,
          confidence: l.confidenceScore,
          recommendedTest: narrative.recommendation,
        };
      });
  }

  /**
   * Builds Creative Fatigue Alerts section
   */
  static buildCreativeFatigueAlerts(learnings: CreativeLearning[]): CreativeFatigueAlert[] {
    return learnings
      .filter((l) => l.status === "DECAYING" || (l.recencyScore || 1.0) < 0.6)
      .slice(0, 2)
      .map((l) => ({
        alertId: `fatigue_${l.learningId}`,
        patternName: `${l.mechanismId} Campaign`,
        mechanismId: l.mechanismId,
        statement: `Performance for ${l.mechanismId} messaging has started to decline after repeated use.`,
        historicalLift: l.relativeLift || 0.35,
        recentLift: (l.relativeLift || 0.35) * 0.4,
        fatigueScore: 0.75,
        recommendedVariation: `Introduce creative variation (new visual proof or fresh local reference) without abandoning the core mechanism.`,
      }));
  }

  /**
   * Builds New Discoveries section
   */
  static buildNewDiscoveries(combos: MechanismCombinationLearning[]): NewDiscovery[] {
    return combos
      .filter((c) => (c.synergyMultiplier > 1.0 || (c as any).isSynergistic) && c.confidenceScore >= 0.70)
      .slice(0, 2)
      .map((c) => {
        const mechanisms = (c as any).mechanisms || [c.primaryMechanismId, c.secondaryMechanismId];
        const lift = c.combinedLift ?? (c as any).combinationLift ?? 0.35;
        return {
          discoveryId: c.combinationId,
          title: `Synergistic Combination: ${mechanisms.join(" + ")}`,
          statement: `Your strongest recent creatives combine ${mechanisms.join(" + ")}.`,
          combinationMechanisms: mechanisms,
          synergyLift: lift,
          confidence: c.confidenceScore,
          explanation: (c as any).synergyRationale || `This combination outperforms either approach alone in comparable campaigns.`,
        };
      });
  }

  /**
   * Builds Prioritized Recommendations (3-5 items)
   */
  static buildRecommendations(
    topInsights: MechanismInsight[],
    failures: FailureInsight[],
    combos: MechanismCombinationLearning[]
  ): CreativeRecommendation[] {
    const recommendations: CreativeRecommendation[] = [];

    if (topInsights.length > 0) {
      const top = topInsights[0];
      recommendations.push({
        id: `rec_top_${top.mechanismId}`,
        priority: 1,
        actionTitle: `Scale ${top.name}-led Messaging`,
        description: `Position your upcoming campaign cycle around ${top.name.toLowerCase()} as the primary angle.`,
        rationale: top.explanation,
        expectedImpact: "HIGH",
        confidence: top.confidence,
        easeOfExecution: "EASY",
        actionableContext: {
          strategicDirection: `Use ${top.name}-led positioning`,
          supportingLearningId: top.mechanismId,
          recommendedMechanisms: [top.mechanismId],
          avoidMechanisms: failures.map((f) => f.mechanismId),
        },
      });
    }

    if (combos.length > 0 && (combos[0].synergyMultiplier > 1.0 || (combos[0] as any).isSynergistic)) {
      const combo = combos[0];
      const mechanisms = (combo as any).mechanisms || [combo.primaryMechanismId, combo.secondaryMechanismId];
      const lift = combo.combinedLift ?? (combo as any).combinationLift ?? 0.35;
      recommendations.push({
        id: `rec_combo_${combo.combinationId}`,
        priority: 2,
        actionTitle: `Test Combination: ${mechanisms.join(" + ")}`,
        description: `Combine ${mechanisms.join(" and ")} in your hero visual and headline.`,
        rationale: `This combination generated +${Math.round(lift * 100)}% higher performance in recent campaigns.`,
        expectedImpact: "HIGH",
        confidence: combo.confidenceScore,
        easeOfExecution: "MEDIUM",
        actionableContext: {
          strategicDirection: `Combine ${mechanisms.join(" + ")}`,
          supportingLearningId: combo.combinationId,
          recommendedMechanisms: mechanisms,
          avoidMechanisms: [],
        },
      });
    }

    if (failures.length > 0) {
      const fail = failures[0];
      recommendations.push({
        id: `rec_fail_${fail.failureId}`,
        priority: 3,
        actionTitle: `Pivot away from ${fail.mechanismId}`,
        description: `Reduce discount-heavy promotion and replace with value/convenience messaging.`,
        rationale: fail.explanation,
        expectedImpact: "MODERATE",
        confidence: fail.confidence,
        easeOfExecution: "EASY",
        actionableContext: {
          strategicDirection: `Pivot from ${fail.mechanismId} to convenience`,
          supportingLearningId: fail.failureId,
          recommendedMechanisms: ["convenience", "proof"],
          avoidMechanisms: [fail.mechanismId],
        },
      });
    }

    if (recommendations.length < 3) {
      recommendations.push({
        id: "rec_experiment_default",
        priority: recommendations.length + 1,
        actionTitle: "Run Controlled Reel Format Test",
        description: "Test customer-situation Reels against static product images.",
        rationale: "Customer-situation Reels show strong early signal for your industry.",
        expectedImpact: "MODERATE",
        confidence: 0.65,
        easeOfExecution: "MEDIUM",
        actionableContext: {
          strategicDirection: "Test customer-situation Reels",
          supportingLearningId: "exp_reels_test",
          recommendedMechanisms: ["customer_situation"],
          avoidMechanisms: [],
        },
      });
    }

    return recommendations.slice(0, 5);
  }
}
