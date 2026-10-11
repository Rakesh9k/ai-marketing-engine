import type { CompatibilityDimension, EntityRef, OntologyRegistry, PsychologyCondition, ValidationIssue } from '../ontology';
import { PSYCHOLOGY_ROLES, type PsychologyPrinciple, type PsychologyRole } from './psychology-types';

/**
 * Relationship queries and composition checks for psychology. None of these rank, score or recommend; they expose
 * what the graph and a principle's own conditions say, so a later engine (10.12) can reason over them.
 */
const psy = (id: string): EntityRef => ({ type: 'psychology', id });
const ids = (edges: { target: { type: string; id?: string } }[], type: string): string[] =>
  edges.filter((e) => e.target.type === type).map((e) => (e.target as { id: string }).id);

export function compatibleMechanisms(registry: OntologyRegistry, principleId: string): string[] {
  return ids(registry.from(psy(principleId), ['compatibleWith', 'supports']), 'creative_mechanism');
}
export function incompatibleMechanisms(registry: OntologyRegistry, principleId: string): string[] {
  return ids(registry.from(psy(principleId), ['conflictsWith', 'notRecommendedWith']), 'creative_mechanism');
}
export function relatedPsychology(registry: OntologyRegistry, principleId: string): string[] {
  return ids(registry.from(psy(principleId), ['oftenCombinedWith', 'compatibleWith', 'alternativeTo']), 'psychology');
}
export function constrainingAntiPatterns(registry: OntologyRegistry, principleId: string): string[] {
  return ids(registry.from(psy(principleId), ['constrainedBy']), 'anti_pattern');
}

// ---------------------------------------------------------------------------
// Psychology stack (bank §53, §68–70): primary / secondary / supporting.
// The "few dominant appeals" guideline is a heuristic with an explicit override, never a law.
// ---------------------------------------------------------------------------
export interface StackMember {
  readonly id: string;
  readonly role: PsychologyRole;
}
export const DEFAULT_MAX_DOMINANT_APPEALS = 2;

export function evaluatePsychologyStack(
  registry: OntologyRegistry,
  stack: readonly StackMember[],
  opts: { justification?: string } = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const member of stack) {
    if (!(PSYCHOLOGY_ROLES as readonly string[]).includes(member.role)) {
      issues.push({ severity: 'error', code: 'INVALID_ROLE', message: `Unknown role "${member.role}" for ${member.id}.` });
    }
    if (seen.has(member.id)) issues.push({ severity: 'error', code: 'DUPLICATE_STACK_MEMBER', message: `${member.id} appears more than once.` });
    seen.add(member.id);
    const principle = registry.get('psychology', member.id);
    if (!principle) issues.push({ severity: 'error', code: 'UNKNOWN_PRINCIPLE', message: `Unknown psychology principle "${member.id}".` });
    else if (principle.status === 'deprecated') issues.push({ severity: 'warning', code: 'DEPRECATED_PRINCIPLE', message: `${member.id} is deprecated.` });
  }

  const primaries = stack.filter((m) => m.role === 'primary');
  if (primaries.length === 0 && stack.length > 0) issues.push({ severity: 'warning', code: 'NO_PRIMARY', message: 'The stack has no primary principle; name the dominant appeal.' });
  if (primaries.length > 1) issues.push({ severity: 'warning', code: 'MULTIPLE_PRIMARIES', message: 'More than one primary principle competes for dominance.' });

  const dominant = stack.filter((m) => m.role !== 'supporting').length;
  if (dominant > DEFAULT_MAX_DOMINANT_APPEALS && !opts.justification) {
    issues.push({ severity: 'warning', code: 'STACK_TOO_DENSE', message: `${dominant} dominant appeals (guideline: at most ${DEFAULT_MAX_DOMINANT_APPEALS}). Add a strategic justification or demote some to supporting.` });
  }

  // Potential (not absolute) conflicts, from the graph, in either direction.
  const members = stack.map((m) => m.id);
  for (const a of members) {
    for (const edge of registry.from(psy(a), ['conflictsWith', 'notRecommendedWith'])) {
      if (edge.target.type === 'psychology' && members.includes(edge.target.id)) {
        const when = edge.conditions?.length ? ` under: ${edge.conditions.join('; ')}` : '';
        issues.push({ severity: 'warning', code: 'POTENTIAL_CONFLICT', message: `${a} and ${edge.target.id} can conflict${when}. ${edge.rationale ?? ''}`.trim() });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Contextual fit, as an explanation — not a score.
// ---------------------------------------------------------------------------
export interface ContextFact {
  readonly dimension: CompatibilityDimension;
  readonly value: string;
}
export interface ContextMatch {
  readonly blockers: readonly PsychologyCondition[];
  readonly supports: readonly PsychologyCondition[];
}

/** Which of the principle's own structured conditions a situation matches. Supports "why / why not this principle". */
export function matchContext(principle: PsychologyPrinciple, facts: readonly ContextFact[]): ContextMatch {
  const hit = (c: PsychologyCondition) => !!c.dimension && !!c.value && facts.some((f) => f.dimension === c.dimension && f.value === c.value);
  return {
    blockers: (principle.whenNotToUse ?? []).filter(hit),
    supports: (principle.whenToUse ?? []).filter(hit),
  };
}
