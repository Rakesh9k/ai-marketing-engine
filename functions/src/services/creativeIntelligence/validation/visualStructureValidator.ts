import type { VisualStructure } from '../ontology/visual-structure';
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

// Prohibited ethical boundaries for visual content
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
 * Validate a VisualStructure instance.
 * Returns an array of ValidationIssue – empty array means the grammar is valid.
 */
export function validateVisualStructure(vs: VisualStructure): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Basic required fields are enforced by Zod schema on creation.

  // 2. Composition layoutType must be one of the allowed enums (Zod already guarantees).

  // 3. Image requirements sanity checks
  if (vs.imageRequirements) {
    const ir = vs.imageRequirements;
    if (ir.required && ir.minimumAssets < 1) {
      issues.push({
        path: '/imageRequirements/minimumAssets',
        message: 'If image requirements are required, minimumAssets must be at least 1.',
        severity: 'error',
      });
    }
    if (ir.imageTypes.length === 0) {
      issues.push({
        path: '/imageRequirements/imageTypes',
        message: 'At least one image type should be specified.',
        severity: 'warning',
      });
    }
  }

  // 4. Video requirements sanity checks
  if (vs.videoRequirements) {
    const vr = vs.videoRequirements;
    if (vr.required && vr.minimumClips < 1) {
      issues.push({
        path: '/videoRequirements/minimumClips',
        message: 'If video is required, minimumClips must be at least 1.',
        severity: 'error',
      });
    }
  }

  // 5. Ethical boundaries – prohibit forbidden statements
  (vs.ethicalBoundaries ?? []).forEach((eb, idx) => {
    if (PROHIBITED_BOUNDARIES.includes(eb.toLowerCase())) {
      issues.push({
        path: `/ethicalBoundaries/${idx}`,
        message: `Prohibited ethical boundary: '${eb}'.`,
        severity: 'error',
      });
    }
  });

  // 6. Reference existence checks for any EntityRef arrays
  const refFields: Record<string, any[]> = {
    bestSituations: vs.bestSituations ?? [],
    compatibleMechanisms: vs.compatibleMechanisms ?? [],
    compatibleStoryStructures: vs.compatibleStoryStructures ?? [],
    compatibleHooks: vs.compatibleHooks ?? [],
    compatiblePsychology: vs.compatiblePsychology ?? [],
    supportsPrinciples: vs.supportsPrinciples ?? [],
    antiPatterns: vs.antiPatterns ?? [],
    relationships: vs.relationships ?? [],
  };
  for (const [field, refs] of Object.entries(refFields)) {
    refs.forEach((ref) => {
      // ref can be EntityRef or relationship object; handle both
      if ((ref as any).type && (ref as any).id) {
        const r = ref as any;
        const exists = OntologyRegistry.has(r.type, r.id);
        if (!exists) {
          issues.push({
            path: `/${field}`,
            message: `Reference id '${r.id}' of type '${r.type}' in ${field} does not exist in OntologyRegistry.`,
            severity: 'error',
          });
        }
      }
    });
  }

  // 7. Information density must be one of allowed values (Zod handles) but warn if 'adaptive' used without aspectRatioAdaptation
  if (vs.informationDensity === 'adaptive' && (!vs.adaptability || !vs.adaptability.aspectRatioAdaptation)) {
    issues.push({
      path: '/adaptability',
      message: 'Adaptive information density should provide aspectRatioAdaptation guidance.',
      severity: 'warning',
    });
  }

  return issues;
}
