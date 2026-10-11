/**
 * PHASE 15 — Blueprint Compatibility & Conflict Resolution Service
 * Evaluates strategic compatibility between mixed components and resolves conflicts
 * using the strict priority hierarchy: Business Brain > Truth Gates > Opportunity > Primary Concept > Selections.
 */

import type { ConceptMixSelection, ConflictDetection, ComponentAdaptationRecord } from './mixing.types';
import type { ConceptSynthesisInput, CreativeConcept } from '../synthesis/synthesis.types';

export interface CompatibilityAnalysisResult {
  compatibilityScore: number; // 0..100
  conflicts: ConflictDetection[];
  adaptations: ComponentAdaptationRecord[];
}

export class BlueprintCompatibilityService {
  /**
   * Analyzes compatibility across selected components and resolves strategic, emotional, brand, and offer conflicts.
   */
  public static analyzeAndResolve(
    selectionInput: ConceptMixSelection,
    input: ConceptSynthesisInput,
    conceptsMap: Map<string, CreativeConcept>,
    _primaryConcept: CreativeConcept
  ): CompatibilityAnalysisResult {
    const conflicts: ConflictDetection[] = [];
    const adaptations: ComponentAdaptationRecord[] = [];
    let compatibilityScore = 95;

    // -----------------------------------------------------------------
    // 1. OFFER CONFLICT CHECK (Business Brain & Truth Gate Precedence)
    // -----------------------------------------------------------------
    const officialOffer = input.campaignIntent.offerDetails?.offerTitle || input.creativeBrainAnswers?.offer;
    const selectedOfferComp = selectionInput.selections.find((s) => s.component === 'offerIntegration');

    if (selectedOfferComp) {
      const sourceConcept = conceptsMap.get(selectedOfferComp.conceptId);
      if (sourceConcept && officialOffer) {
        if (
          sourceConcept.offerIntegration.toLowerCase().includes('50%') &&
          !officialOffer.toLowerCase().includes('50%')
        ) {
          conflicts.push({
            conflictType: 'OFFER',
            severity: 'HIGH',
            description: `Selected offer integration from "${sourceConcept.name}" specifies unsupported discount claim.`,
            resolutionStrategy: `Business Brain truth precedence applied: Overrode discount claim with official offer "${officialOffer}".`,
          });
          adaptations.push({
            component: 'offerIntegration',
            original: sourceConcept.offerIntegration,
            adapted: `${officialOffer} serves as the decision solution.`,
            reason: 'Business Brain & Truth Gate precedence.',
          });
          compatibilityScore -= 10;
        }
      }
    }

    // -----------------------------------------------------------------
    // 2. BRAND CONFLICT CHECK (Forbidden Words & Tone Precedence)
    // -----------------------------------------------------------------
    const forbiddenWords = input.businessBrain.brandVoice?.forbiddenWords || [];
    const selectedHookComp = selectionInput.selections.find((s) => s.component === 'hook');

    if (selectedHookComp) {
      const sourceConcept = conceptsMap.get(selectedHookComp.conceptId);
      if (sourceConcept) {
        for (const forbidden of forbiddenWords) {
          if (forbidden && sourceConcept.hook.toLowerCase().includes(forbidden.toLowerCase())) {
            conflicts.push({
              conflictType: 'BRAND',
              severity: 'HIGH',
              description: `Selected hook from "${sourceConcept.name}" contains forbidden brand word "${forbidden}".`,
              resolutionStrategy: `Reframed hook to preserve relatable mechanism while removing forbidden word "${forbidden}".`,
            });
            const sanitizedHook = sourceConcept.hook.replace(new RegExp(forbidden, 'gi'), 'value');
            adaptations.push({
              component: 'hook',
              original: sourceConcept.hook,
              adapted: sanitizedHook,
              reason: `Removed forbidden brand word "${forbidden}".`,
            });
            compatibilityScore -= 15;
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // 3. EMOTIONAL & STRATEGIC CONFLICT CHECK
    // -----------------------------------------------------------------
    const selectedEmotionComp = selectionInput.selections.find((s) => s.component === 'emotionalTerritory');
    const selectedVisualComp = selectionInput.selections.find((s) => s.component === 'visualDirection');

    if (selectedEmotionComp && selectedVisualComp) {
      const emotionConcept = conceptsMap.get(selectedEmotionComp.conceptId);
      const visualConcept = conceptsMap.get(selectedVisualComp.conceptId);

      if (emotionConcept && visualConcept) {
        const emotionStr = emotionConcept.emotionalResponse.primary.toLowerCase();
        const visualStr = visualConcept.visualDirection.toLowerCase();

        if (
          (emotionStr.includes('togetherness') || emotionStr.includes('warmth')) &&
          (visualStr.includes('shock') || visualStr.includes('discount'))
        ) {
          conflicts.push({
            conflictType: 'EMOTIONAL',
            severity: 'MEDIUM',
            description: `Visual direction ("${visualConcept.name}") emphasizes price shock, while selected emotion ("${emotionConcept.name}") emphasizes warmth/togetherness.`,
            resolutionStrategy: `Adapted visual treatment to use price as an attention trigger while keeping the family gathering at the center of the scene.`,
          });
          adaptations.push({
            component: 'visualDirection',
            original: visualConcept.visualDirection,
            adapted: `Show family dining scene with the ${officialOffer || 'special combo'} displayed as the focal solution connecting everyone.`,
            reason: `Reconciled visual price contrast with warmth/togetherness emotional territory.`,
          });
          compatibilityScore -= 10;
        }
      }
    }

    return {
      compatibilityScore: Math.max(50, compatibilityScore),
      conflicts,
      adaptations,
    };
  }
}
