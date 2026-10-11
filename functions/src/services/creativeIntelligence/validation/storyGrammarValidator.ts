import type { StoryGrammar } from '../ontology/story-structure';
import { OntologyRegistry } from '../ontology/ontology-registry';

/** Validation issue interface */
export interface ValidationIssue {
  /** JSON pointer path to the problematic field */
  path: string;
  /** Human‑readable message */
  message: string;
  /** Severity level */
  severity: 'error' | 'warning';
}

// List of prohibited ethical boundaries – same as HookPattern
const PROHIBITED_BOUNDARIES = [
  'fabricated scarcity',
  'false statistics',
  'fake testimonials',
  'misleading urgency',
];

/**
 * Validate a StoryGrammar instance.
 * Returns an array of ValidationIssue – empty array means the grammar is valid.
 */
export function validateStoryGrammar(grammar: StoryGrammar): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Beat ordering – must be sequential starting at 1 and unique
  const orders = grammar.beats.map((b) => b.order);
  const sorted = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      issues.push({
        path: '/beats',
        message: `Beats must have sequential order starting at 1. Expected ${i + 1} but got ${sorted[i]}.`,
        severity: 'error',
      });
      break;
    }
  }

  // 2. Required variables referenced by beats must exist in grammar.variables
  const variableNames = (grammar.variables ?? []).map((v) => v.name);
  grammar.beats.forEach((beat, idx) => {
    (beat.requiredVariables ?? []).forEach((varName) => {
      if (!variableNames.includes(varName)) {
        issues.push({
          path: `/beats/${idx}/requiredVariables`,
          message: `Beat requires variable '${varName}' which is not defined in grammar.variables.`,
          severity: 'error',
        });
      }
    });
  });

  // 3. Variable type validation – only allow defined enum values
  const allowedTypes = ['string', 'number', 'boolean', 'enum'];
  (grammar.variables ?? []).forEach((v, idx) => {
    if (v.type && !allowedTypes.includes(v.type)) {
      issues.push({
        path: `/variables/${idx}/type`,
        message: `Invalid variable type '${v.type}'. Allowed: ${allowedTypes.join(', ')}`,
        severity: 'error',
      });
    }
    if (v.type === 'enum' && (!v.enumValues || v.enumValues.length === 0)) {
      issues.push({
        path: `/variables/${idx}/enumValues`,
        message: `Enum variable '${v.name}' must provide non‑empty enumValues array.`,
        severity: 'error',
      });
    }
  });

  // 4. Reference existence checks – any EntityRef array should point to an existing entity in the registry
  const refFields: Record<string, any[]> = {
    bestSituations: grammar.bestSituations ?? [],
    psychology: grammar.psychology ?? [],
    mechanisms: grammar.mechanisms ?? [],
    compatibleHooks: grammar.compatibleHooks ?? [],
    compatibleInsights: grammar.compatibleInsights ?? [],
    compatibleStructures: grammar.compatibleStructures ?? [],
    compatibleWith: grammar.compatibleWith ?? [],
    avoidWith: grammar.avoidWith ?? [],
  };
  for (const [field, refs] of Object.entries(refFields)) {
    refs.forEach((ref) => {
      // ref is { id: string, name?: string }
      const exists =
        OntologyRegistry.has('story_structure', ref.id) ||
        OntologyRegistry.has('hook_pattern', ref.id) ||
        OntologyRegistry.has('insight_pattern', ref.id) ||
        OntologyRegistry.has('audience_situation', ref.id) ||
        OntologyRegistry.has('psychology', ref.id) ||
        OntologyRegistry.has('creative_mechanism', ref.id);
      if (!exists) {
        issues.push({
          path: `/${field}`,
          message: `Reference id '${ref.id}' in ${field} does not exist in OntologyRegistry.`,
          severity: 'error',
        });
      }
    });
  }

  // 5. Ethical boundaries – disallow prohibited entries
  (grammar.ethicalBoundaries ?? []).forEach((eb, idx) => {
    if (PROHIBITED_BOUNDARIES.includes(eb.toLowerCase())) {
      issues.push({
        path: `/ethicalBoundaries/${idx}`,
        message: `Prohibited ethical boundary: '${eb}'.`,
        severity: 'error',
      });
    }
  });

  return issues;
}
