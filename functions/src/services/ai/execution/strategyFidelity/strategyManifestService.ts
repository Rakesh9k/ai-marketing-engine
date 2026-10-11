/**
 * PHASE 17 — Strategy Manifest Service
 * Derives machine-readable execution prompt directives, forbidden reinterpretations,
 * and brand truth guards for the execution engine compiler.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type {
  ForbiddenReinterpretation,
  StrategyLock,
  StrategyManifest,
} from './strategyFidelity.types';

export class StrategyManifestService {
  /**
   * Derives a StrategyManifest from a CreativeBlueprint and StrategyLock.
   */
  public deriveManifest(blueprint: CreativeBlueprint, lock: StrategyLock): StrategyManifest {
    const promptDirectives: string[] = [];

    // Core Concept & Mechanism Directives
    if (blueprint.coreConcept) {
      promptDirectives.push(`Execute Concept: "${blueprint.coreConcept.name}" — ${blueprint.coreConcept.oneLineIdea}`);
      promptDirectives.push(`Human Insight: ${blueprint.coreConcept.humanInsight}`);
    }

    if (blueprint.creativeMechanism) {
      promptDirectives.push(`Creative Mechanism: ${blueprint.creativeMechanism.primaryMechanism} (${blueprint.creativeMechanism.intendedAudienceEffect})`);
    }

    if (blueprint.emotionalDirection) {
      promptDirectives.push(`Emotional Goal: Evoke ${blueprint.emotionalDirection.primaryEmotion} (${blueprint.emotionalDirection.desiredAudienceFeeling})`);
    }

    if (blueprint.tone) {
      promptDirectives.push(`Tone: ${blueprint.tone.primary}`);
      if (blueprint.tone.avoid && blueprint.tone.avoid.length > 0) {
        promptDirectives.push(`Avoid Tones: ${blueprint.tone.avoid.join(', ')}`);
      }
    }

    if (blueprint.visualDirection) {
      promptDirectives.push(`Visual Concept: ${blueprint.visualDirection.visualConcept}`);
      promptDirectives.push(`Visual Subject: ${blueprint.visualDirection.subject}`);
    }

    // Message Priority List
    const messagePriorityList: string[] = [];
    if (blueprint.messageHierarchy?.primaryMessage) {
      messagePriorityList.push(`[PRIMARY] ${blueprint.messageHierarchy.primaryMessage}`);
    }
    if (blueprint.messageHierarchy?.supportingMessages) {
      blueprint.messageHierarchy.supportingMessages.forEach((msg, idx) => {
        messagePriorityList.push(`[SUPPORTING_${idx + 1}] ${msg}`);
      });
    }

    // Offer Role Constraint
    const offerRole = blueprint.offer?.strategicRole || 'none';
    const offerRoleConstraint = this.deriveOfferRoleConstraint(offerRole, blueprint.offer?.name || blueprint.offer?.value);

    // Forbidden Reinterpretations
    const forbiddenReinterpretations = this.deriveForbiddenReinterpretations(blueprint, offerRole);

    // Brand Truth Guards
    const brandTruthGuards: string[] = [];
    if (blueprint.brandConstraints) {
      blueprint.brandConstraints.forEach((c) => brandTruthGuards.push(`Brand Guard: [${c.category}] ${c.rule}`));
    }
    if (blueprint.truthConstraints) {
      blueprint.truthConstraints.forEach((c) => brandTruthGuards.push(`Truth Guard: [${c.category}] ${c.rule}`));
    }
    if (blueprint.approvedFacts) {
      blueprint.approvedFacts.forEach((f) => brandTruthGuards.push(`Approved Fact: ${f.statement}`));
    }
    if (blueprint.prohibitedClaims) {
      blueprint.prohibitedClaims.forEach((p) => brandTruthGuards.push(`Prohibited Claim: ${p.claim} (${p.reason})`));
    }

    return {
      lockId: lock.id,
      strategicHash: lock.strategicHash,
      promptDirectives,
      forbiddenReinterpretations,
      offerRoleConstraint,
      messagePriorityList,
      brandTruthGuards,
    };
  }

  private deriveOfferRoleConstraint(offerRole: string, offerDetail?: string): string {
    switch (offerRole) {
      case 'primary_hook':
        return `The offer (${offerDetail || 'deal'}) is the primary hook. Display prominently as main focal point.`;
      case 'supporting_proof':
        return `The offer is a supporting proof element. Do NOT make it the primary headline. Keep focal prominence secondary.`;
      case 'conversion_trigger':
      case 'urgency':
        return `The offer serves as a closing conversion trigger. Must support the core concept, not replace it.`;
      case 'value_anchor':
        return `The offer acts as a value anchor. Feature cleanly in secondary text / CTA block.`;
      case 'none':
      default:
        return `No primary offer specified. Rely entirely on core concept storytelling.`;
    }
  }

  private deriveForbiddenReinterpretations(
    blueprint: CreativeBlueprint,
    offerRole: string
  ): ForbiddenReinterpretation[] {
    const list: ForbiddenReinterpretation[] = [];

    // 1. Offer Dominance Protection
    if (offerRole !== 'primary_hook') {
      list.push({
        type: 'OFFER_DOMINANCE',
        description: 'Do not convert concept into a price/discount poster.',
        rule: `Offer role is '${offerRole}'. The core concept headline and visual must remain primary; offer prominence score must not exceed 60%.`,
      });
    }

    // 2. Tone Shift Protection
    if (blueprint.tone?.primary) {
      list.push({
        type: 'TONE_SHIFT',
        description: 'Do not alter approved tone.',
        rule: `Tone must remain '${blueprint.tone.primary}'. Do not use aggressive hard-sell or out-of-brand language.`,
      });
    }

    // 3. Concept Replacement Protection
    if (blueprint.coreConcept?.name) {
      list.push({
        type: 'CONCEPT_REPLACEMENT',
        description: 'Do not substitute core concept with generic marketing templates.',
        rule: `Core concept is '${blueprint.coreConcept.name}'. All creative copy and visuals must directly serve this specific narrative territory.`,
      });
    }

    // 4. Message Hierarchy Reversal
    if (blueprint.messageHierarchy?.primaryMessage) {
      list.push({
        type: 'MESSAGE_HIERARCHY_REVERSAL',
        description: 'Do not elevate secondary text above primary message.',
        rule: `Primary message is "${blueprint.messageHierarchy.primaryMessage}". Supporting points must remain subordinate in visual weight and position.`,
      });
    }

    // 5. Emotional Drift
    if (blueprint.emotionalDirection?.primaryEmotion) {
      list.push({
        type: 'EMOTIONAL_DRIFT',
        description: 'Do not shift emotional territory.',
        rule: `Primary emotional driver is '${blueprint.emotionalDirection.primaryEmotion}'. Creative must evoke this state rather than conflicting emotions.`,
      });
    }

    return list;
  }
}
