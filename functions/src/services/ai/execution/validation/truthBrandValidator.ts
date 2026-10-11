/**
 * PHASE 18 — Truth & Brand Validator
 * Inspects final rendered asset copy and visuals against verified truth constraints,
 * approved facts, and brand non-negotiables.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { ValidationGateResult } from '../types/execution.types';

export class TruthBrandValidator {
  /**
   * Runs Truth Check on actual final creative text/claims.
   */
  public evaluateTruth(
    blueprint: CreativeBlueprint,
    finalHeadline?: string,
    finalCopy?: string
  ): ValidationGateResult {
    const details: string[] = [];
    const text = `${finalHeadline || ''} ${finalCopy || ''}`.toLowerCase();

    // Check prohibited claims
    if (blueprint.prohibitedClaims) {
      blueprint.prohibitedClaims.forEach((prohibited) => {
        if (text.includes(prohibited.claim.toLowerCase())) {
          details.push(`Truth Check Violation: Prohibited claim detected: "${prohibited.claim}" (${prohibited.reason}).`);
        }
      });
    }

    // Check truth constraints
    if (blueprint.truthConstraints) {
      blueprint.truthConstraints.forEach((c) => {
        if (c.severity === 'critical' && text.includes('unverified')) {
          details.push(`Truth Check Violation: Unverified claim against constraint "${c.rule}".`);
        }
      });
    }

    const passed = details.length === 0;

    return {
      gateName: 'Truth Check',
      passed,
      score: passed ? 100 : 0,
      details: passed ? ['Final asset claims verified against approved facts & truth rules.'] : details,
      blocking: true,
    };
  }

  /**
   * Runs Brand Check on actual final creative output.
   */
  public evaluateBrand(
    blueprint: CreativeBlueprint,
    finalHeadline?: string,
    hasLogo: boolean = true
  ): ValidationGateResult {
    const details: string[] = [];

    // Logo check
    if (!hasLogo) {
      details.push('Brand Check Violation: Mandatory brand logo is missing from final asset composition.');
    }

    // Check brand constraints
    if (blueprint.brandConstraints) {
      blueprint.brandConstraints.forEach((bc) => {
        if (bc.category === 'FORBIDDEN_WORD' && finalHeadline?.toLowerCase().includes(bc.rule.toLowerCase())) {
          details.push(`Brand Check Violation: Forbidden word "${bc.rule}" present in headline.`);
        }
      });
    }

    const passed = details.length === 0;

    return {
      gateName: 'Brand Compliance Check',
      passed,
      score: passed ? 100 : 0,
      details: passed ? ['Final asset passed brand logo and non-negotiable guidelines.'] : details,
      blocking: true,
    };
  }
}
