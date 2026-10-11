import type { StrategicDirectionCandidate } from "../../types/directions";
import { STRATEGIC_AXES_TAXONOMY, INDUSTRY_EXPLORATION_MAP } from "../taxonomy/strategicAxesTaxonomy";

export interface GenerateCandidatesContext {
  sessionId: string;
  campaignId?: string;
  tenantId: string;
  industry?: string;
  audienceContext?: string;
  objective?: string;
  offerContext?: string;
  currentDirectionName?: string;
}

export class DirectionCandidateGenerator {
  /**
   * Generates 8–12 candidate strategic directions dynamically based on domain knowledge.
   */
  public generateCandidatePool(context: GenerateCandidatesContext): StrategicDirectionCandidate[] {
    const industryKey = (context.industry || "RESTAURANT").toUpperCase();
    const recommendedAxes = INDUSTRY_EXPLORATION_MAP[industryKey] || INDUSTRY_EXPLORATION_MAP["DEFAULT"];

    const candidatePool: StrategicDirectionCandidate[] = [];
    const timestamp = new Date().toISOString();

    for (const axisKey of Object.keys(STRATEGIC_AXES_TAXONOMY)) {
      const def = STRATEGIC_AXES_TAXONOMY[axisKey];

      // Customization based on context
      const isRecommended = recommendedAxes.includes(axisKey);
      const isCurrent = context.currentDirectionName?.toLowerCase() === def.name.toLowerCase();

      const candidate: StrategicDirectionCandidate = {
        id: `dir_cand_${axisKey.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        sessionId: context.sessionId,
        campaignId: context.campaignId,
        tenantId: context.tenantId,
        name: def.name,
        shortLabel: axisKey.replace("_", " "),
        strategicThesis: def.description,
        audience: context.audienceContext || "Target Audience Segment",
        customerTension: `Audience tension addressed via ${def.category.toLowerCase()} angle: ${def.communicationFrame}`,
        desiredEmotion: def.category === "EMOTIONAL" ? "Belonging & Joy" : "Confidence & Relief",
        marketingObjective: context.objective || "Conversion & Sales Growth",
        psychology: [{ id: `psych_${axisKey.toLowerCase()}`, name: def.defaultPsychology, category: def.category }],
        mechanisms: [{ id: `mech_${axisKey.toLowerCase()}`, name: def.defaultMechanism }],
        concept: def.communicationFrame,
        hookTerritory: `Hook framing based on ${def.name}`,
        visualTerritory: `Visual direction depicting ${def.category.toLowerCase()} scenario`,
        copyTerritory: `Copy message highlighting ${def.defaultPsychology}`,
        offerTreatment: context.offerContext ? `Positioning offer (${context.offerContext}) around ${def.name}` : `Standard offer positioning`,
        ctaTreatment: "Direct CTA aligned with campaign intent",
        formatRecommendations: ["Instagram Reel", "Feed Banner", "WhatsApp Message"],
        strategicRationale: `Positions campaign through ${def.category.toLowerCase()} strategy: ${def.description}`,
        whyItFits: `Directly aligns with ${context.industry || "business"} target audience needs.`,
        strengths: [
          `Clear ${def.category.toLowerCase()} appeal`,
          `Differentiated positioning strategy`,
          `Strong resonance for ${context.audienceContext || "target audience"}`,
        ],
        tradeoffs: [
          def.category === "EMOTIONAL"
            ? "Requires higher visual storytelling production"
            : "Less emotional differentiation",
        ],
        risks: [
          def.category === "COMPETITIVE"
            ? "Potential risk of polarizing passive viewers"
            : "Moderate competition in market segment",
        ],
        thingsToAvoid: ["Generic discount spamming", "Inconsistent brand voice"],
        bestWhen: [
          `Target audience seeks ${def.defaultPsychology}`,
          `Campaign objective is ${context.objective || "conversion"}`,
        ],
        avoidWhen: [
          `Brand positioning prohibits ${def.category.toLowerCase()} framing`,
        ],
        evidence: [
          { scope: "KNOWN", claim: `Business context supports ${def.name} approach` },
          { scope: "LEARNED", claim: `Historical benchmarks indicate strong response to ${def.defaultMechanism}` },
        ],
        compatibilityScore: isRecommended ? 0.92 : 0.78,
        strategicFitScore: isRecommended ? 0.90 : 0.75,
        distinctivenessScore: isCurrent ? 0.50 : 0.88,
        viabilityScore: isRecommended ? 88 : 78,
        confidence: isRecommended ? 0.89 : 0.76,
        source: isCurrent ? "RECOMMENDED" : "EXPLORED",
        status: isCurrent ? "ACTIVE" : "CANDIDATE",
        createdAt: timestamp,
      };

      candidatePool.push(candidate);
    }

    return candidatePool;
  }
}
