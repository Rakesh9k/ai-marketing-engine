import type { MechanismEthicsProfile, EthicalRiskLevel } from "../../types/governance";

export const MECHANISM_ETHICS_REGISTRY: Record<string, MechanismEthicsProfile> = {
  mech_urgency: {
    mechanismId: "mech_urgency",
    ethicalRisk: "MODERATE",
    acceptableUses: [
      "Highlighting legitimate limited-time offer deadlines",
      "Encouraging timely action for active promotions",
    ],
    prohibitedUses: [
      "Manufactured false countdown timers",
      "False 'ending in 5 mins' claims when no deadline exists",
    ],
    vulnerableAudienceRisk: true,
    requiresTruthValidation: true,
    requiresEvidence: true,
    requiresAdditionalReview: false,
  },
  mech_scarcity: {
    mechanismId: "mech_scarcity",
    ethicalRisk: "HIGH",
    acceptableUses: [
      "Highlighting true physical inventory limits",
      "Communicating verified event seat capacity",
    ],
    prohibitedUses: [
      "False 'only 2 left' inventory claims when stock is unlimited",
      "Fabricated seat/table shortage claims",
    ],
    vulnerableAudienceRisk: true,
    requiresTruthValidation: true,
    requiresEvidence: true,
    requiresAdditionalReview: true,
  },
  mech_social_proof: {
    mechanismId: "mech_social_proof",
    ethicalRisk: "MODERATE",
    acceptableUses: [
      "Quoting verified customer rating scores",
      "Displaying authentic verified customer review counts",
    ],
    prohibitedUses: [
      "Fabricating customer review numbers or ratings",
      "Generating AI avatars passed off as real customers",
    ],
    vulnerableAudienceRisk: false,
    requiresTruthValidation: true,
    requiresEvidence: true,
    requiresAdditionalReview: false,
  },
  mech_fear_reduction: {
    mechanismId: "mech_fear_reduction",
    ethicalRisk: "HIGH",
    acceptableUses: [
      "Reassuring customers on safety, hygiene, or privacy",
      "Explaining money-back policies clearly",
    ],
    prohibitedUses: [
      "Stoking health or security anxiety to coerce purchase",
      "Exploiting body insecurity or financial dread",
    ],
    vulnerableAudienceRisk: true,
    requiresTruthValidation: true,
    requiresEvidence: true,
    requiresAdditionalReview: true,
  },
  mech_convenience: {
    mechanismId: "mech_convenience",
    ethicalRisk: "LOW",
    acceptableUses: [
      "Highlighting easy online ordering, quick delivery, or doorstep service",
    ],
    prohibitedUses: [
      "Claiming instant delivery when operational setup cannot support it",
    ],
    vulnerableAudienceRisk: false,
    requiresTruthValidation: false,
    requiresEvidence: false,
    requiresAdditionalReview: false,
  },
  mech_loss_aversion: {
    mechanismId: "mech_loss_aversion",
    ethicalRisk: "MODERATE",
    acceptableUses: [
      "Reminding users of expiring verified savings",
    ],
    prohibitedUses: [
      "Implying severe non-financial loss or medical consequences for missing an offer",
    ],
    vulnerableAudienceRisk: true,
    requiresTruthValidation: true,
    requiresEvidence: false,
    requiresAdditionalReview: false,
  },
};

export function getMechanismEthicsProfile(mechanismId: string): MechanismEthicsProfile {
  return (
    MECHANISM_ETHICS_REGISTRY[mechanismId] || {
      mechanismId,
      ethicalRisk: "LOW" as EthicalRiskLevel,
      acceptableUses: ["Standard promotional communication"],
      prohibitedUses: ["Deceptive or misleading framing"],
      vulnerableAudienceRisk: false,
      requiresTruthValidation: true,
      requiresEvidence: false,
      requiresAdditionalReview: false,
    }
  );
}
