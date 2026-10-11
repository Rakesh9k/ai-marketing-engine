/**
 * PHASE 14 — Strategic Fingerprint Service
 * Extracts the 10-dimensional strategic fingerprint and territory mapping
 * for a candidate creative concept.
 */

import type { CreativeConcept } from '../synthesis/synthesis.types';
import type { ConceptStrategicFingerprint, ConceptTerritory } from './differentiation.types';

export class StrategicFingerprintService {
  /**
   * Generates an immutable strategic fingerprint for a candidate concept.
   */
  public static extractFingerprint(concept: CreativeConcept): ConceptStrategicFingerprint {
    const hookType = this.classifyHookType(concept.hook);
    const offerRole = this.classifyOfferRole(concept.offerIntegration, concept.creativeMechanism.name);

    return {
      coreInsight: concept.humanInsight,
      audienceTension: concept.whyThisAudience,
      emotionalTerritory: `${concept.emotionalResponse.primary}${concept.emotionalResponse.secondary ? ' + ' + concept.emotionalResponse.secondary : ''}`,
      valueProposition: concept.oneLineIdea,
      creativeMechanism: `${concept.creativeMechanism.name}: ${concept.creativeMechanism.explanation}`,
      narrativeTerritory: concept.storyDirection,
      culturalTerritory: concept.evidence?.businessBrain?.find((e) => e.includes('city') || e.includes('location')) || undefined,
      offerRole,
      identityTerritory: concept.whyThisBusiness,
      primaryHookType: hookType,
    };
  }

  /**
   * Maps a concept to a clear, user-facing Creative Territory.
   */
  public static deriveTerritory(concept: CreativeConcept): ConceptTerritory {
    const primaryEmotion = concept.emotionalResponse.primary;
    const name = this.deriveTerritoryName(concept);

    return {
      id: `territory_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      primaryEmotion,
      secondaryEmotion: concept.emotionalResponse.secondary,
      humanInsight: concept.humanInsight,
      audienceTension: concept.whyThisAudience,
      valueInterpretation: concept.oneLineIdea,
      creativeMechanism: concept.creativeMechanism.name,
      offerRole: concept.offerIntegration,
      identityAngle: concept.whyThisBusiness,
    };
  }

  private static deriveTerritoryName(concept: CreativeConcept): string {
    const nameLower = concept.name.toLowerCase();
    const emotionLower = concept.emotionalResponse.primary.toLowerCase();
    const mechanismLower = concept.creativeMechanism.name.toLowerCase();

    if (nameLower.includes('table') || emotionLower.includes('warmth') || emotionLower.includes('togetherness')) {
      return 'Togetherness';
    }
    if (mechanismLower.includes('shock') || mechanismLower.includes('contrast') || emotionLower.includes('surprise')) {
      return 'Unexpected Value';
    }
    if (mechanismLower.includes('elimination') || emotionLower.includes('relief') || nameLower.includes('sorted')) {
      return 'Decision Relief';
    }
    if (nameLower.includes('hyderabad') || nameLower.includes('ritual') || emotionLower.includes('belonging')) {
      return 'Local Identity';
    }
    if (emotionLower.includes('amusement') || mechanismLower.includes('humor') || mechanismLower.includes('reversal')) {
      return 'Relatable Humor';
    }

    // Default fallback territory based on primary emotion
    return primaryEmotionToTerritory(concept.emotionalResponse.primary);
  }

  private static classifyHookType(hook: string): string {
    const h = hook.toLowerCase();
    if (h.includes('₹') || h.includes('$') || h.includes('%')) return 'PRICE_HOOK';
    if (h.includes('?')) return 'QUESTION_HOOK';
    if (h.includes('everyone') || h.includes('why')) return 'SOCIAL_OBSERVATION_HOOK';
    return 'RELATABLE_TENSION_HOOK';
  }

  private static classifyOfferRole(offerIntegration: string, _mechanismName: string): string {
    const o = offerIntegration.toLowerCase();
    if (o.includes('proof')) return 'PROOF_OF_VALUE';
    if (o.includes('solution') || o.includes('problem')) return 'PROBLEM_SOLUTION';
    if (o.includes('bargain') || o.includes('price')) return 'UNEXPECTED_BARGAIN';
    return 'CONVENIENCE_ENTRY_POINT';
  }
}

function primaryEmotionToTerritory(emotion: string): string {
  const e = (emotion || '').toLowerCase();
  if (e.includes('relief')) return 'Decision Relief';
  if (e.includes('warmth') || e.includes('belonging')) return 'Togetherness';
  if (e.includes('surprise') || e.includes('excitement')) return 'Unexpected Value';
  if (e.includes('amusement')) return 'Relatable Humor';
  return 'Strategic Value';
}
