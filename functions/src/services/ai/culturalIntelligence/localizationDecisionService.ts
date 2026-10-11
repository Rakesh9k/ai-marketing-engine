/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Localization Decision Engine & Strategy Synthesizer
 */

import type {
  LocalizationDecision,
  LocalizationStrategy,
  CulturalEvalInput,
  CulturalRelevanceScore,
  LocalReferenceContext,
  CulturalPreferenceOverride,
} from "./culturalIntelligence.types";

export class LocalizationDecisionService {
  /**
   * Deterministically calculates LocalizationDecision based on Business Brain overrides and Cultural Relevance Score.
   */
  public makeLocalizationDecision(
    input: CulturalEvalInput,
    relevanceScore: CulturalRelevanceScore,
    referenceContexts: LocalReferenceContext[] = [],
    businessOverrides: CulturalPreferenceOverride[] = []
  ): { decision: LocalizationDecision; strategy: LocalizationStrategy } {
    const reasons: string[] = [];
    const signalsNotUsed: string[] = [];
    const recommendedReferences: string[] = [];

    // 1. Business Brain Override Check
    const langOverride = businessOverrides.find((o) => o.preferenceType === "LANGUAGE_CHOICE")?.value;
    const refOverride = businessOverrides.find((o) => o.preferenceType === "REFERENCE_USAGE")?.value;

    if (langOverride === "ENGLISH_ONLY") {
      reasons.push("Business Brain override enforced English-first communication.");
    }
    if (refOverride === "NO_LOCAL_REFERENCES") {
      reasons.push("Business Brain override disabled explicit local references.");
      signalsNotUsed.push("Explicit local landmarks and neighborhood names");
    }

    // 2. Filter usable references passing Naturalness Test
    const usableRefs = referenceContexts.filter(
      (r) => r.recommendation === "USE" && refOverride !== "NO_LOCAL_REFERENCES"
    );

    usableRefs.forEach((r) => recommendedReferences.push(r.referenceId));

    referenceContexts
      .filter((r) => r.recommendation === "AVOID")
      .forEach((r) => signalsNotUsed.push(`Local reference '${r.referenceId}' (${r.reason})`));

    // 3. Determine Expression Level (NONE, SUBTLE, MODERATE, EXPLICIT)
    let shouldLocalize = true;
    let expressionLevel: "NONE" | "SUBTLE" | "MODERATE" | "EXPLICIT" = "SUBTLE";

    const intent = (input.campaignIntent || "").toLowerCase();
    const isCulturalFestivalCampaign =
      intent.includes("festival") ||
      intent.includes("celebration") ||
      intent.includes("cultural") ||
      intent.includes("heritage");

    if (relevanceScore.overall < 45 || refOverride === "NO_LOCAL_REFERENCES") {
      shouldLocalize = false;
      expressionLevel = "NONE";
      reasons.push("Overall cultural relevance score is low or overridden by business preferences.");
    } else if (isCulturalFestivalCampaign) {
      expressionLevel = "EXPLICIT";
      reasons.push("Campaign intent centers a cultural occasion; explicit localization is appropriate.");
    } else if (refOverride === "EXPLICIT_REFERENCES" || (usableRefs.length > 0 && intent.includes("local reference"))) {
      expressionLevel = "MODERATE";
      reasons.push("High situational relevance and valid local references support natural local expression.");
    } else {
      expressionLevel = "SUBTLE";
      reasons.push("Local context influences scenario & timing, but explicit cultural markers are omitted to remain natural.");
      signalsNotUsed.push("Explicit city name and landmark references");
    }

    const recommendedLanguages =
      langOverride === "ENGLISH_ONLY"
        ? ["English"]
        : ["English", "Teluglish (Telugu-English Mix)"];

    const decision: LocalizationDecision = {
      shouldLocalize,
      expressionLevel,
      recommendedLanguages,
      recommendedReferences,
      culturalSignals: ["Audience lifestyle alignment", "Weekend dining pattern"],
      reasons,
      sensitivityWarnings: [],
      confidence: relevanceScore.confidence,
    };

    const strategy: LocalizationStrategy = {
      level: expressionLevel,
      strategicInfluence: [
        `Targeting ${input.audience || "local catchment"} during ${input.campaignIntent || "campaign occasion"}`,
        `Selected expression level ${expressionLevel}`,
      ],
      visibleExpressions: expressionLevel === "NONE" ? [] : recommendedReferences,
      languageChoice: recommendedLanguages[0],
      referenceChoice: recommendedReferences,
      culturalSignalsUsed: decision.culturalSignals,
      signalsIntentionallyNotUsed: signalsNotUsed,
      explanation: reasons.join(" "),
    };

    return { decision, strategy };
  }
}
