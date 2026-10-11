import type { CreativeExplanation, DecisionTrace } from "../../types/explainability";

export interface ExplanationValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
}

export class ExplanationValidator {
  /**
   * Validates a generated explanation against security, truth, and tenant isolation rules.
   */
  public validateExplanation(
    explanation: CreativeExplanation,
    trace: DecisionTrace,
    expectedTenantId: string
  ): ExplanationValidationResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // 1. Multi-Tenant Security Check
    if (trace.tenantId && trace.tenantId !== expectedTenantId) {
      violations.push(
        `Tenant Isolation Failure: Trace tenantId '${trace.tenantId}' does not match context tenantId '${expectedTenantId}'`
      );
    }

    // 2. Cross-tenant leakage check in text content
    const crossTenantPattern = /tenant_[a-zA-Z0-9_-]+/g;
    const matches = (explanation.summary + explanation.why).match(crossTenantPattern);
    if (matches) {
      for (const match of matches) {
        if (match !== expectedTenantId) {
          violations.push(`Cross-Tenant Privacy Leak: Explanation contains reference to external tenant ID '${match}'`);
        }
      }
    }

    // 3. Truth & Fact Alignment Check
    const traceClaims = new Set(trace.decisions.flatMap((d) => d.evidence.map((e) => e.claim)));
    for (const evItem of explanation.evidenceBreakdown) {
      if (!traceClaims.has(evItem.claim)) {
        violations.push(
          `Truth Alignment Failure: Explanation references claim '${evItem.claim}' not found in decision trace`
        );
      }
    }

    // 4. Summary & Reason Completeness
    if (!explanation.summary || explanation.summary.trim().length === 0) {
      violations.push("Validation Error: Explanation summary cannot be empty");
    }
    if (!explanation.why || explanation.why.trim().length === 0) {
      violations.push("Validation Error: Detailed reasoning ('why') cannot be empty");
    }

    if (explanation.depth === "INTELLIGENCE" && (!explanation.whyNotAlternatives || explanation.whyNotAlternatives.length === 0)) {
      warnings.push("Intelligence depth explanation should include alternative rejections when available");
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
    };
  }
}
