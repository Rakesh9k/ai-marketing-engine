/**
 * PHASE 18 — Creative Quality Evaluator
 * Evaluates execution quality dimensions (clarity, visual hierarchy, readability, CTA clarity).
 * Note: Creative Quality evaluates execution craft, distinct from Strategy Fidelity.
 */

import type { ValidationGateResult } from '../types/execution.types';

export interface QualityDimensions {
  visualHierarchy: number; // 0..20
  messageClarity: number;  // 0..20
  readability: number;     // 0..20
  ctaClarity: number;      // 0..20
  compositionCraft: number; // 0..20
}

export class CreativeQualityEvaluator {
  /**
   * Evaluates Creative Quality for a post or reel asset.
   */
  public evaluateQuality(
    headline?: string,
    visualConcept?: string,
    ctaText?: string
  ): ValidationGateResult {
    let visualHierarchy = 20;
    let messageClarity = 20;
    let readability = 20;
    let ctaClarity = 20;
    let compositionCraft = 20;

    if (!headline || headline.length > 120) {
      messageClarity = 12; // Penalty for overly verbose headline
      readability = 14;
    }

    if (!ctaText) {
      ctaClarity = 5;
    }

    if (!visualConcept) {
      visualHierarchy = 10;
      compositionCraft = 10;
    }

    const overallScore = visualHierarchy + messageClarity + readability + ctaClarity + compositionCraft;
    const passed = overallScore >= 70;

    return {
      gateName: 'Creative Quality Evaluation',
      passed,
      score: overallScore,
      details: [
        `Creative Quality Score: ${overallScore}/100`,
        `Visual Hierarchy: ${visualHierarchy}/20, Message Clarity: ${messageClarity}/20, Readability: ${readability}/20, CTA Clarity: ${ctaClarity}/20, Craft: ${compositionCraft}/20`,
      ],
      blocking: false, // Quality is advisory, does not block if strategy and truth pass
    };
  }
}
