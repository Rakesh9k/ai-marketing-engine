/**
 * PHASE 15 — Component Dependency & Strategic Weight Service
 * Defines component weights, dependency graphs, and infers the strategic anchor concept
 * for concept mixing synthesis.
 */

import type { MixComponentType, ComponentSelection } from './mixing.types';
import type { CreativeConcept } from '../synthesis/synthesis.types';

export const COMPONENT_WEIGHTS: Record<MixComponentType, number> = {
  humanInsight: 1.0,
  coreIdea: 1.0,
  offerIntegration: 0.9,
  emotionalTerritory: 0.85,
  creativeMechanism: 0.85,
  tone: 0.8,
  visualDirection: 0.75,
  storyDirection: 0.75,
  hook: 0.7,
  cta: 0.65,
  format: 0.5,
  platform: 0.4,
};

export class ComponentDependencyService {
  /**
   * Infers the primary strategic anchor concept ID from component selections if not explicitly provided.
   */
  public static inferPrimaryConceptId(
    selections: ComponentSelection[],
    availableConcepts: CreativeConcept[]
  ): string {
    const conceptWeights: Record<string, number> = {};

    availableConcepts.forEach((c) => {
      conceptWeights[c.id] = 0;
    });

    selections.forEach((sel) => {
      const weight = COMPONENT_WEIGHTS[sel.component] || 0.5;
      conceptWeights[sel.conceptId] = (conceptWeights[sel.conceptId] || 0) + weight;
    });

    let maxWeight = -1;
    let primaryId = availableConcepts[0]?.id || '';

    Object.entries(conceptWeights).forEach(([conceptId, weight]) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        primaryId = conceptId;
      }
    });

    return primaryId;
  }

  /**
   * Checks if a strategic core component (Insight or Core Idea) is present in selections.
   */
  public static hasStrategicCoreSelection(selections: ComponentSelection[]): boolean {
    return selections.some((s) => s.component === 'coreIdea' || s.component === 'humanInsight');
  }
}
