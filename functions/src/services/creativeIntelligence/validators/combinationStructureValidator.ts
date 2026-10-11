// Combination Structure Validator
// Provides hard‑exclusion checks for CombinationRule instances.
// Used by the deterministic engine to reject FORBIDDEN/ETHICAL/TRUTH violations before scoring.

import type { CombinationRule } from "../ontology/combination.types";

// Simple interface for validation issues
export interface ValidationIssue {
  ruleId: string;
  relationship: string;
  reason: string;
  priority: string;
}

/**
 * Validate a set of rules against a given context.
 * Currently this function focuses on hard exclusions:
 *   - FORBIDDEN (ethical / truth violations)
 *   - ETHICAL priority (e.g., "ETHICAL" > "TRUTH" > "BUSINESS")
 *   - BUSINESS capability constraints (placeholder – can be expanded later)
 * Returns an array of ValidationIssue objects describing any problems.
 */
export function validateCombinationStructure(
  rules: CombinationRule[],
  _context: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    const r = rule as any;
    const ruleId = String(r.id || r.slug || 'unknown');
    const relationship = String(r.relationship || 'NEUTRAL');
    const priority = String(r.priority || 'STRATEGIC');
    const rationale = String(r.rationale || r.definition || 'Forbidden by constraint');

    // Forbidden rules are always hard exclusions
    if (relationship === "FORBIDDEN") {
      issues.push({
        ruleId,
        relationship,
        reason: rationale,
        priority,
      });
      continue;
    }

    // ETHICAL priority rules marked as AVOID
    if (priority === "ETHICAL" && relationship === "AVOID") {
      issues.push({
        ruleId,
        relationship,
        reason: "Avoidance flagged by ethical priority; may be rejected depending on context",
        priority,
      });
    }

    // TRUTH priority rules marked as AVOID
    if (priority === "TRUTH" && relationship === "AVOID") {
      issues.push({
        ruleId,
        relationship,
        reason: "Avoidance flagged by truth priority; may be rejected depending on context",
        priority,
      });
    }

    // BUSINESS capability checks
    if (priority === "BUSINESS" && relationship === "AVOID") {
      issues.push({
        ruleId,
        relationship,
        reason: "Business capability avoidance",
        priority,
      });
    }
  }
  return issues;
}
