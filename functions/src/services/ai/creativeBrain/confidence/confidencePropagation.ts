/**
 * PHASE 24 — Confidence Propagation Graph
 * Propagates evidence and confidence updates along dependency links:
 * Audience -> Customer Situation -> Customer Insight -> Opportunity
 * Product -> Offer -> Differentiator
 */

import type {
  CreativeConfidenceDimension,
  CreativeConfidence,
} from './confidence.types';
import { ConfidenceScoring } from './confidenceScoring';

export interface PropagationLink {
  upstream: CreativeConfidenceDimension;
  downstream: CreativeConfidenceDimension;
  factor: number; // 0.0 to 1.0 (coupling factor)
}

export const CONFIDENCE_GRAPH_LINKS: PropagationLink[] = [
  { upstream: 'AUDIENCE', downstream: 'CUSTOMER_INSIGHT', factor: 0.60 },
  { upstream: 'CUSTOMER_INSIGHT', downstream: 'EMOTIONAL_DIRECTION', factor: 0.50 },
  { upstream: 'PRODUCT', downstream: 'OFFER', factor: 0.70 },
  { upstream: 'OFFER', downstream: 'DIFFERENTIATOR', factor: 0.50 },
  { upstream: 'DIFFERENTIATOR', downstream: 'CUSTOMER_INSIGHT', factor: 0.40 },
];

export class ConfidencePropagation {
  /**
   * Propagates confidence along defined dependency graph links.
   */
  public static propagate(
    dimensions: Record<CreativeConfidenceDimension, CreativeConfidence>,
    updatedDimensions: CreativeConfidenceDimension[]
  ): CreativeConfidenceDimension[] {
    const affected: Set<CreativeConfidenceDimension> = new Set();

    for (const link of CONFIDENCE_GRAPH_LINKS) {
      if (updatedDimensions.includes(link.upstream)) {
        const upstreamState = dimensions[link.upstream];
        const downstreamState = dimensions[link.downstream];

        if (upstreamState && downstreamState && upstreamState.score > 0.0) {
          // Calculate propagated evidence strength
          const propagatedStrength = Math.round(upstreamState.score * link.factor * 100) / 100;
          if (propagatedStrength <= 0.0) continue;

          // Downstream confidence capped by upstream confidence
          const maxAllowedDownstream = upstreamState.score;

          // Check if propagated evidence improves downstream
          const existingPropagated = downstreamState.evidence.find(
            (e) => e.source === 'SYSTEM_DERIVATION' && e.referenceId === `prop_${link.upstream}`
          );

          if (!existingPropagated || existingPropagated.strength < propagatedStrength) {
            const newEv = {
              id: `ev_prop_${Date.now()}_${link.downstream}`,
              source: 'SYSTEM_DERIVATION' as const,
              strength: propagatedStrength,
              explanation: `Propagated confidence from ${link.upstream} (score ${upstreamState.score})`,
              referenceId: `prop_${link.upstream}`,
              createdAt: new Date().toISOString(),
            };

            // Replace or push evidence
            if (existingPropagated) {
              const idx = downstreamState.evidence.indexOf(existingPropagated);
              downstreamState.evidence[idx] = newEv;
            } else {
              downstreamState.evidence.push(newEv);
            }

            // Recalculate downstream score and cap by upstream score
            let newScore = ConfidenceScoring.calculateCombinedScore(downstreamState.evidence);
            if (newScore > maxAllowedDownstream) {
              newScore = maxAllowedDownstream;
            }

            if (newScore > downstreamState.score) {
              downstreamState.score = newScore;
              downstreamState.status = ConfidenceScoring.getStatusForScore(newScore);
              downstreamState.lastUpdatedAt = new Date().toISOString();
              affected.add(link.downstream);
            }
          }
        }
      }
    }

    return Array.from(affected);
  }
}
