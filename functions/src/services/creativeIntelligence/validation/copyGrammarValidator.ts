import type { CopyGrammar } from '../ontology/copy-structure';
import { OntologyRegistry } from '../ontology/ontology-registry';

/** Validation issue interface (shared across validators) */
export interface ValidationIssue {
  /** JSON pointer path to the problematic field */
  path: string;
  /** Human‑readable message */
  message: string;
  /** Severity level */
  severity: 'error' | 'warning';
}

// Prohibited ethical boundaries for copy content
const PROHIBITED_BOUNDARIES = [
  'fabricated scarcity',
  'false statistics',
  'fake testimonials',
  'misleading urgency',
  'fake before/after',
  'artificial before/after',
  'misleading transformation',
];

/**
 * Validate a CopyGrammar instance.
 * Returns an array of ValidationIssue – empty array means the grammar is valid.
 */
export function validateCopyGrammar(cg: CopyGrammar): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Sequence must have at least one beat and orders must be contiguous starting at 1
  if (!cg.sequence || cg.sequence.length === 0) {
    issues.push({ path: '/sequence', message: 'CopyGrammar must define a non‑empty sequence of beats.', severity: 'error' });
  } else {
    const orders = cg.sequence.map(b => b.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        issues.push({ path: `/sequence/${i}/order`, message: `Beat orders must start at 1 and be contiguous. Expected ${i + 1} but found ${orders[i]}.`, severity: 'error' });
      }
    }
  }

  // 2. Proof requirement consistency – if level is strict/required and requiredForClaims true, ensure at least one proof beat present
  const proofBeats = cg.sequence.filter(b => b.informationRole === 'proof');
  if ((cg.proofRequirement?.level === 'required' || cg.proofRequirement?.level === 'strict') && cg.proofRequirement?.requiredForClaims && proofBeats.length === 0) {
    issues.push({ path: '/proofRequirement', message: 'Proof requirement demands proof beats but none are defined in the sequence.', severity: 'error' });
  }

  // 3. Ethical boundaries – prohibit forbidden statements
  (cg.ethicalBoundaries ?? []).forEach((eb, idx) => {
    if (PROHIBITED_BOUNDARIES.includes(eb.toLowerCase())) {
      issues.push({ path: `/ethicalBoundaries/${idx}`, message: `Prohibited ethical boundary: '${eb}'.`, severity: 'error' });
    }
  });

  // 4. Reference existence checks for any EntityRef arrays (compatibility fields)
  const refFields: Record<string, any[]> = {
    bestSituations: cg.bestSituations ?? [],
    compatibleMechanisms: cg.compatibleMechanisms ?? [],
    compatibleStoryStructures: cg.compatibleStoryStructures ?? [],
    compatibleVisualStructures: cg.compatibleVisualStructures ?? [],
    compatiblePsychology: cg.compatiblePsychology ?? [],
    antiPatterns: cg.antiPatterns ?? [],
    relationships: cg.relationships ?? [],
  };
  for (const [field, refs] of Object.entries(refFields)) {
    refs.forEach(ref => {
      if ((ref as any).type && (ref as any).id) {
        const r = ref as any;
        const exists = OntologyRegistry.has(r.type, r.id);
        if (!exists) {
          issues.push({ path: `/${field}`, message: `Reference id '${r.id}' of type '${r.type}' in ${field} does not exist in OntologyRegistry.`, severity: 'error' });
        }
      }
    });
  }

  // 5. Tone profile sanity – ensure primary tone is provided
  if (!cg.tone?.primary) {
    issues.push({ path: '/tone/primary', message: 'Tone profile must define a primary tone.', severity: 'error' });
  }

  // 6. Sentence length profile – if dominant is 'mixed' ensure rhythm is defined
  if (cg.sentenceLength?.dominant === 'mixed' && !cg.sentenceLength?.rhythm) {
    issues.push({ path: '/sentenceLength/rhythm', message: 'Mixed sentence length should specify a rhythm.', severity: 'warning' });
  }

  // 7. Specificity level 'high' should request evidence requirements
  if (cg.specificity?.level === 'high' && (!cg.evidenceRequirements || cg.evidenceRequirements.length === 0)) {
    issues.push({ path: '/evidenceRequirements', message: 'High specificity copy should declare evidence requirements.', severity: 'warning' });
  }

  return issues;
}
