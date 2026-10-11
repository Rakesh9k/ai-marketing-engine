/**
 * PHASE 16 — Creative Blueprint Provenance Service
 * Builds immutable decision provenance linking the canonical blueprint to its source
 * Business Brain, Creative Opportunity, Creative Bank, and Concept Mixing choices.
 */

import type { BlueprintProvenanceSpec } from '../types/creativeBlueprint.types';
import type { MixedConcept, BlueprintProvenance as MixedProvenance } from '../mixing/mixing.types';

export class CreativeBlueprintProvenanceService {
  /**
   * Constructs the full, auditable Blueprint Provenance object.
   */
  public static buildProvenance(
    opportunityId: string,
    mixedConcept: MixedConcept,
    _mixedProvenance?: MixedProvenance
  ): BlueprintProvenanceSpec {
    const sourceConceptIds = mixedConcept.sourceConcepts || [];
    const componentSources = (mixedConcept.selectedComponents || []).map((sc) => ({
      component: sc.component,
      sourceConceptId: sc.conceptId,
      userSelected: true,
    }));

    const adaptations = (mixedConcept.adaptations || []).map((a) => ({
      field: a.component,
      original: a.original,
      final: a.adapted,
      reason: a.reason,
    }));

    const conflictsResolved = (mixedConcept.conflictsResolved || []).map((c) => ({
      conflict: typeof c === 'string' ? c : (c as any).description || (c as any).conflictType,
      resolution: typeof c === 'string' ? c : (c as any).resolutionStrategy || 'Resolved strategically',
      reason: 'Reconciled during Phase 15 Concept Mixing synthesis.',
    }));

    return {
      opportunityId,
      sourceConceptIds,
      componentSources,
      adaptations,
      conflictsResolved,
    };
  }
}
