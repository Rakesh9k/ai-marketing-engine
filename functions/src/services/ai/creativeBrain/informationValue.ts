import type { CreativeBrainRequirement } from './stateMachineTypes';
import type { EvidenceStore } from './evidenceStore';

/**
 * Information Value Resolver
 *
 * Formula:
 * InformationValue = (DecisionImpact * Uncertainty * CreativeRelevance / 10000) - UserEffort
 *
 * Ranks missing requirements so the State Machine prioritizes information
 * that changes strategic/creative direction, while skipping low-value questions
 * (e.g., operating hours, business founding year).
 */
export class InformationValueResolver {
  public static calculateRequirement(
    key: string,
    label: string,
    category: 'business' | 'audience' | 'objective' | 'offer' | 'motivation' | 'territory',
    decisionImpact: number, // 0..100
    creativeRelevance: number, // 0..100
    userEffort: number, // 0..100
    evidenceStore: EvidenceStore
  ): CreativeBrainRequirement {
    const hasEv = evidenceStore.hasEvidence(key);
    const uncertainty = hasEv ? 10 : 90; // High uncertainty if evidence is missing
    const isCritical = decisionImpact >= 80 && uncertainty > 30;

    // Formula calculation normalized 0..100
    const rawValue = (decisionImpact * uncertainty * creativeRelevance) / 10000;
    const informationValue = Math.max(0, Math.round(rawValue - userEffort * 0.2));

    return {
      key,
      label,
      category,
      isCritical,
      decisionImpact,
      uncertainty,
      creativeRelevance,
      userEffort,
      informationValue,
    };
  }

  public static rankMissingRequirements(
    requirements: readonly CreativeBrainRequirement[]
  ): readonly CreativeBrainRequirement[] {
    return [...requirements]
      .filter((req) => req.uncertainty > 30 && req.informationValue > 25)
      .sort((a, b) => b.informationValue - a.informationValue);
  }
}
