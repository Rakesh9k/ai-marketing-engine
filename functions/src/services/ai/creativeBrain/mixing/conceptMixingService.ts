/**
 * PHASE 15 — Concept Mixing Service
 * Master orchestrator for Phase 15 of Mitra's Creative Brain.
 * Synthesizes user-selected concept components into a single, strategically coherent Creative Blueprint.
 * Enforces tenant isolation, dependency graphs, compatibility checks, and conflict resolution.
 */

import type {
  ConceptMixSelection,
  ConceptMixingResult,
  MixedConcept,
  BlueprintProvenance,
} from './mixing.types';
import type { ConceptSynthesisInput, CreativeConcept } from '../synthesis/synthesis.types';

import { ComponentDependencyService } from './componentDependencyService';
import { BlueprintCompatibilityService } from './blueprintCompatibilityService';
import { CreativeBlueprintSynthesisService } from './creativeBlueprintSynthesisService';

export class ConceptMixingService {
  /**
   * Main entry point for mixing user-selected concept components into a Creative Blueprint.
   */
  public mixConcepts(
    selectionInput: ConceptMixSelection,
    input: ConceptSynthesisInput,
    availableConcepts: CreativeConcept[]
  ): ConceptMixingResult {
    // -----------------------------------------------------------------
    // 1. TENANT ISOLATION & AUTHORIZATION CHECK
    // -----------------------------------------------------------------
    if (
      input.businessBrain.tenantId &&
      selectionInput.tenantId &&
      selectionInput.tenantId !== input.businessBrain.tenantId
    ) {
      throw new Error('SecurityError: Cross-tenant concept mixing access denied.');
    }

    // -----------------------------------------------------------------
    // 2. CONCEPT MAP & ID VALIDATION
    // -----------------------------------------------------------------
    const conceptsMap = new Map<string, CreativeConcept>();
    availableConcepts.forEach((c) => conceptsMap.set(c.id, c));

    for (const selection of selectionInput.selections) {
      if (!conceptsMap.has(selection.conceptId)) {
        throw new Error(`AuthorizationError: Invalid or unauthorized concept ID "${selection.conceptId}".`);
      }
    }

    // -----------------------------------------------------------------
    // 3. STRATEGIC ANCHOR SELECTION
    // -----------------------------------------------------------------
    const primaryConceptId =
      selectionInput.primaryConceptId ||
      ComponentDependencyService.inferPrimaryConceptId(selectionInput.selections, availableConcepts);

    const primaryConcept = conceptsMap.get(primaryConceptId) || availableConcepts[0];
    if (!primaryConcept) {
      throw new Error('ConceptMixingError: No valid candidate concepts available for synthesis.');
    }

    // -----------------------------------------------------------------
    // 4. COMPATIBILITY & CONFLICT ANALYSIS
    // -----------------------------------------------------------------
    const compatibilityResult = BlueprintCompatibilityService.analyzeAndResolve(
      selectionInput,
      input,
      conceptsMap,
      primaryConcept
    );

    // -----------------------------------------------------------------
    // 5. SYNTHESIZE MIXED CONCEPT
    // -----------------------------------------------------------------
    const sourceConceptIds = Array.from(new Set(selectionInput.selections.map((s) => s.conceptId)));
    if (!sourceConceptIds.includes(primaryConcept.id)) {
      sourceConceptIds.unshift(primaryConcept.id);
    }

    // Extract component sources
    const getSelectedComponentSource = (compName: string, fallback: string): string => {
      const found = selectionInput.selections.find((s) => s.component === compName);
      if (!found) return fallback;
      const c = conceptsMap.get(found.conceptId);
      return c ? (c as any)[compName] || fallback : fallback;
    };

    const getAdaptedComponent = (compName: string, fallback: string): string => {
      const adapted = compatibilityResult.adaptations.find((a) => a.component === compName);
      if (adapted) return adapted.adapted;
      return getSelectedComponentSource(compName, fallback);
    };

    const synthesizedIdea = getAdaptedComponent('coreIdea', primaryConcept.oneLineIdea);
    const synthesizedInsight = getAdaptedComponent('humanInsight', primaryConcept.humanInsight);
    const synthesizedHook = getAdaptedComponent('hook', primaryConcept.hook);
    const synthesizedVisual = getAdaptedComponent('visualDirection', primaryConcept.visualDirection);
    const synthesizedStory = getAdaptedComponent('storyDirection', primaryConcept.storyDirection);
    const synthesizedOffer = getAdaptedComponent('offerIntegration', primaryConcept.offerIntegration);
    const synthesizedCTA = getAdaptedComponent('cta', primaryConcept.cta);

    // Emotional territory synthesis
    const emotionSel = selectionInput.selections.find((s) => s.component === 'emotionalTerritory');
    const emotionConcept = emotionSel ? conceptsMap.get(emotionSel.conceptId) : primaryConcept;
    const synthesizedEmotion = emotionConcept
      ? emotionConcept.emotionalResponse
      : primaryConcept.emotionalResponse;

    // Mechanism synthesis
    const mechSel = selectionInput.selections.find((s) => s.component === 'creativeMechanism');
    const mechConcept = mechSel ? conceptsMap.get(mechSel.conceptId) : primaryConcept;
    const synthesizedMechanism = mechConcept
      ? mechConcept.creativeMechanism
      : primaryConcept.creativeMechanism;

    // Deduplicate required assets
    const allRequired = Array.from(
      new Set(
        availableConcepts.flatMap((c) => c.requiredAssets?.required || ['Product photo', 'Logo'])
      )
    );
    const allRecommended = Array.from(
      new Set(availableConcepts.flatMap((c) => c.requiredAssets?.recommended || []))
    );

    const mixedConcept: MixedConcept = {
      id: `mix_${input.campaignId}_${Date.now().toString(36)}`,
      name: `Synthesized Direction: ${primaryConcept.name}`,
      sourceConcepts: sourceConceptIds,
      selectedComponents: selectionInput.selections,
      synthesizedIdea,
      synthesizedInsight,
      synthesizedEmotion,
      synthesizedHook,
      synthesizedMechanism,
      synthesizedVisualDirection: synthesizedVisual,
      synthesizedStoryDirection: synthesizedStory,
      synthesizedOfferIntegration: synthesizedOffer,
      synthesizedCTA,
      recommendedFormat: primaryConcept.recommendedFormat,
      recommendedPlatform: primaryConcept.recommendedPlatform,
      requiredAssets: {
        required: allRequired,
        recommended: allRecommended,
        optional: ['Background music track'],
      },
      compatibilityScore: compatibilityResult.compatibilityScore,
      strategicCoherenceScore: Math.round(compatibilityResult.compatibilityScore * 0.95),
      adaptations: compatibilityResult.adaptations,
      conflictsResolved: compatibilityResult.conflicts,
    };

    // -----------------------------------------------------------------
    // 6. BUILD PROVENANCE & CREATIVE BLUEPRINT
    // -----------------------------------------------------------------
    const provenance: BlueprintProvenance = {
      sourceConcepts: sourceConceptIds,
      componentSources: selectionInput.selections.map((s) => ({
        component: s.component,
        sourceConceptId: s.conceptId,
      })),
      adaptations: compatibilityResult.adaptations,
      conflictsResolved: compatibilityResult.conflicts.map((c) => ({
        conflictType: c.conflictType,
        resolution: c.resolutionStrategy,
      })),
    };

    const blueprint = CreativeBlueprintSynthesisService.buildBlueprint(
      mixedConcept,
      provenance,
      input
    );

    // -----------------------------------------------------------------
    // 7. BUILD EXPLANATION
    // -----------------------------------------------------------------
    const componentSummary = selectionInput.selections.map((s) => {
      const c = conceptsMap.get(s.conceptId);
      return `Used ${s.component} from "${c?.name || s.conceptId}"`;
    });

    const adaptationsExplained = compatibilityResult.adaptations.map(
      (a) => `Adapted ${a.component}: ${a.reason}`
    );

    return {
      campaignId: input.campaignId,
      blueprint,
      mixedConcept,
      explanation: {
        summary: `Mitra combined core strategic elements from ${sourceConceptIds.length} concepts into a single, production-ready Creative Blueprint.`,
        componentSummary,
        adaptationsExplained,
      },
    };
  }
}
