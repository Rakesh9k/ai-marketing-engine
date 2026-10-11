import type { HookPattern } from '../ontology/hook-pattern';
import { HOOK_VARIABLE_TYPES, HOOK_CATEGORIES } from '../ontology/hook-pattern';
import { OntologyRegistry } from '../ontology/ontology-registry';

// Validation issue interface similar to other validators
export interface ValidationIssue {
  path: string; // JSON pointer like '/variables/0/name'
  message: string;
  severity: 'error' | 'warning';
}

// List of prohibited ethical boundaries (strings that should not appear)
const PROHIBITED_BOUNDARIES = [
  'fabricated scarcity',
  'false statistics',
  'fake testimonials',
  'misleading urgency',
];

/**
 * Validate a HookPattern instance.
 * Returns an array of ValidationIssue; empty array means valid.
 */
export function validateHookPattern(pattern: HookPattern): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Required base fields are already enforced by Zod schema on creation.
  // 2. Validate that placeholders in formula match variable names.
  if (pattern.formula) {
    const placeholderRegex = /\[(.+?)\]/g;
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = placeholderRegex.exec(pattern.formula)) !== null) {
      if (match[1]) found.add(match[1]);
    }
    const variableNames = (pattern.variables ?? []).map((v) => v.name);
    // Missing variable definitions
    for (const ph of found) {
      if (!variableNames.includes(ph)) {
        issues.push({
          path: '/formula',
          message: `Placeholder [${ph}] has no corresponding variable definition.`,
          severity: 'error',
        });
      }
    }
    // Unused variable definitions
    for (const varName of variableNames) {
      if (!found.has(varName)) {
        issues.push({
          path: '/variables',
          message: `Variable '${varName}' defined but not used in formula.`,
          severity: 'warning',
        });
      }
    }
  }

  // 3. Validate variable types and sources against enums.
  const allowedTypes = HOOK_VARIABLE_TYPES as readonly string[];
  const allowedSources = ['BusinessBrain','AudienceSituation','InsightPattern','MarketingObjective','Psychology','CreativeMechanism','CampaignContext','Generated'];
  (pattern.variables ?? []).forEach((v, idx) => {
    if (!allowedTypes.includes(v.type as any)) {
      issues.push({
        path: `/variables/${idx}/type`,
        message: `Invalid variable type '${v.type}'.`,
        severity: 'error',
      });
    }
    if (!allowedSources.includes(v.source)) {
      issues.push({
        path: `/variables/${idx}/source`,
        message: `Invalid variable source '${v.source}'.`,
        severity: 'error',
      });
    }
    // optional regex validation placeholder
    if (v.validation?.regex) {
      try { new RegExp(v.validation.regex); } catch {
        issues.push({
          path: `/variables/${idx}/validation/regex`,
          message: `Invalid regex pattern '${v.validation.regex}'.`,
          severity: 'error',
        });
      }
    }
  });

  // 4. Verify referenced entity IDs exist in OntologyRegistry.
  const refFields: Record<string, string[]> = {
    psychologyRefs: pattern.psychologyRefs ?? [],
    mechanismRefs: pattern.mechanismRefs ?? [],
    bestSituationRefs: pattern.bestSituationRefs ?? [],
    bestObjectiveRefs: pattern.bestObjectiveRefs ?? [],
    compatibleInsightRefs: pattern.compatibleInsightRefs ?? [],
  };
  for (const [field, ids] of Object.entries(refFields)) {
    ids.forEach((id) => {
      if (!OntologyRegistry.has('hook_pattern', id) && !OntologyRegistry.has('insight_pattern', id) && !OntologyRegistry.has('audience_situation', id) && !OntologyRegistry.has('psychology', id) && !OntologyRegistry.has('creative_mechanism', id)) {
        issues.push({
          path: `/${field}`,
          message: `Reference id '${id}' in ${field} does not exist in OntologyRegistry.`,
          severity: 'error',
        });
      }
    });
  }

  // 5. Check ethical boundaries against prohibited list.
  (pattern.ethicalBoundaries ?? []).forEach((eb, idx) => {
    if (PROHIBITED_BOUNDARIES.includes(eb.toLowerCase())) {
      issues.push({
        path: `/ethicalBoundaries/${idx}`,
        message: `Prohibited ethical boundary: '${eb}'.`,
        severity: 'error',
      });
    }
  });

  // 6. Ensure category is a known HookCategory.
  if (!(HOOK_CATEGORIES as readonly string[]).includes(pattern.category as any)) {
    issues.push({
      path: '/category',
      message: `Unknown hook category '${pattern.category}'.`,
      severity: 'error',
    });
  }

  return issues;
}
