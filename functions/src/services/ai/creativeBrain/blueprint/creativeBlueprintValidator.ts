/**
 * PHASE 16 — Creative Blueprint Validator Service
 * Performs deterministic validation over the canonical Creative Blueprint.
 * Enforces readiness gates: Strategic Coherence >= 80, Brand Compliance >= 90, Truth Readiness >= 90, Execution Readiness >= 85.
 * Blocks execution if any critical truth/brand gate fails or missing required fields are detected.
 */

import type {
  CanonicalCreativeBlueprint,
  BlueprintValidationResult,
  BlueprintStatus,
} from '../types/creativeBlueprint.types';

export class CreativeBlueprintValidator {
  /**
   * Deterministically validates a Canonical Creative Blueprint before handoff to execution.
   */
  public static validateBlueprint(blueprint: Partial<CanonicalCreativeBlueprint>): BlueprintValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    const blockingIssues: string[] = [];

    // 1. Required Structural Fields Check
    if (!blueprint.campaignId) missingFields.push('campaignId');
    if (!blueprint.tenantId) missingFields.push('tenantId');
    if (!blueprint.audience?.primaryAudience) missingFields.push('audience.primaryAudience');
    if (!blueprint.product?.name) missingFields.push('product.name');
    if (!blueprint.coreConcept?.oneLineIdea) missingFields.push('coreConcept.oneLineIdea');
    if (!blueprint.hook?.hookIdea) missingFields.push('hook.hookIdea');
    if (!blueprint.visualDirection?.visualConcept) missingFields.push('visualDirection.visualConcept');
    if (!blueprint.cta?.action) missingFields.push('cta.action');

    if (missingFields.length > 0) {
      blockingIssues.push(`Missing required blueprint fields: ${missingFields.join(', ')}`);
    }

    // 2. Truth Readiness Evaluation (Max 100)
    let truthReadiness = 100;
    const prohibitedClaims = blueprint.prohibitedClaims || [];
    const headlineText = (blueprint.hook?.hookIdea || '') + ((blueprint.copyDirection as any)?.headline || '');

    for (const item of prohibitedClaims) {
      if (item.claim && headlineText.toLowerCase().includes(item.claim.toLowerCase())) {
        blockingIssues.push(`Truth Constraint Violation: Hook/Headline contains prohibited claim "${item.claim}".`);
        truthReadiness -= 30;
      }
    }

    if (blueprint.offer?.exists && blueprint.offer?.price && !blueprint.offer.sourceFactIds?.length) {
      // Check if price is present without factual verification
      warnings.push('Offer price present without explicit verified fact ID link.');
    }

    // 3. Brand Compliance Evaluation (Max 100)
    let brandCompliance = 100;
    const fullText = `${headlineText} ${blueprint.coreConcept?.oneLineIdea || ''}`.toLowerCase();

    for (const item of prohibitedClaims) {
      if (item.claim && fullText.includes(item.claim.toLowerCase())) {
        blockingIssues.push(`Brand Constraint Violation: Blueprint text contains forbidden brand word "${item.claim}".`);
        brandCompliance -= 25;
      }
    }

    // 4. Strategic Coherence Evaluation (Max 100)
    let strategicCoherence = 90;
    if (blueprint.emotionalDirection?.primaryEmotion && blueprint.visualDirection?.mood) {
      const e = blueprint.emotionalDirection.primaryEmotion.toLowerCase();
      const v = blueprint.visualDirection.mood.toLowerCase();
      if ((e.includes('togetherness') || e.includes('warmth')) && v.includes('shock')) {
        warnings.push('Tension between visual mood and emotional territory.');
        strategicCoherence -= 10;
      }
    }

    // 5. Execution Readiness Evaluation (Max 100)
    let executionReadiness = 90;
    if (!blueprint.requiredAssets?.length) {
      warnings.push('No required assets specified for execution.');
      executionReadiness -= 10;
    }

    // Gate Thresholds: Strategic >= 80, Brand >= 90, Truth >= 90, Execution >= 85
    const passesGates =
      strategicCoherence >= 80 &&
      brandCompliance >= 90 &&
      truthReadiness >= 90 &&
      executionReadiness >= 85 &&
      blockingIssues.length === 0;

    const overallScore = Math.round(
      (strategicCoherence * 0.3) +
      (brandCompliance * 0.25) +
      (truthReadiness * 0.25) +
      (executionReadiness * 0.2)
    );

    const status: BlueprintStatus = passesGates ? 'READY' : 'BLOCKED';

    return {
      valid: passesGates,
      status,
      score: overallScore,
      strategicCoherence,
      brandCompliance,
      truthReadiness,
      executionReadiness,
      missingFields,
      warnings,
      blockingIssues,
    };
  }
}
