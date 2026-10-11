import type { DraftFieldPath, Known, Suggestions } from './fields';
import { asString } from './fields';
import { QUESTIONS, resolve, type QuestionDefinition } from './questions';
import { INDUSTRIES, SUBCATEGORIES } from './taxonomy';

/** The owner never faces more than this many questions at once. */
export const MAX_AT_ONCE = 2;

export interface EngineState {
  /** Confirmed by the owner. The only thing that ever counts as "known". */
  known: Known;
  skipped: ReadonlySet<DraftFieldPath>;
  /**
   * Found or guessed by Mitra, NOT confirmed. Offered to the owner as something to accept, change
   * or ignore. It never resolves a question, never counts toward progress, and never reaches the
   * Business Brain until the owner confirms it.
   */
  suggestions?: Suggestions;
}

const isResolved = (q: QuestionDefinition, { known, skipped }: EngineState): boolean =>
  known[q.field] !== undefined || skipped.has(q.field);

const isEligible = (q: QuestionDefinition, state: EngineState): boolean =>
  !isResolved(q, state) && (q.condition ? q.condition(state.known) : true);

/**
 * What to ask next, chosen from what Mitra already knows rather than from a fixed script.
 *
 * Asks the highest-priority eligible question; a second one joins it only if it belongs to the
 * same group (e.g. your name and your role, or your city and state). Returns [] when nothing
 * relevant is left. Suggestions deliberately do not change which question is next: a guess is a
 * hint for answering it, never a reason to skip asking.
 */
export function selectNext(state: EngineState): QuestionDefinition[] {
  const eligible = QUESTIONS.filter((q) => isEligible(q, state)).sort(
    (a, b) => a.priority - b.priority
  );
  const first = eligible[0];
  if (!first) return [];

  const companions = eligible
    .slice(1)
    .filter((q) => q.group === first.group)
    .slice(0, MAX_AT_ONCE - 1);
  return [first, ...companions];
}

/**
 * 0..1 across the questions on this owner's path. Questions that will only appear after an earlier
 * answer (`expectedLater`) count as pending, so the bar does not leap backwards when they appear.
 */
export function progress(state: EngineState): number {
  const onPath = QUESTIONS.filter(
    (q) => isResolved(q, state) || isEligible(q, state) || q.expectedLater
  );
  if (onPath.length === 0) return 1;
  return onPath.filter((q) => isResolved(q, state)).length / onPath.length;
}

/** Required facts nobody has answered yet — what stands between us and a Business Brain. */
export function missingRequired(state: EngineState): DraftFieldPath[] {
  return QUESTIONS.filter(
    (q) => q.importance === 'required' && state.known[q.field] === undefined
  ).map((q) => q.field);
}

/** A human-readable label for an answer, for the recap ("Cloud Kitchen", not "cloud_kitchen"). */
export function labelFor(field: DraftFieldPath, state: EngineState): string | undefined {
  const value = state.known[field];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.join(', ');

  if (field === 'identity.industry') return INDUSTRIES.find((o) => o.id === value)?.label ?? value;
  if (field === 'identity.subcategory') {
    const industry = asString(state.known['identity.industry']);
    const options = industry
      ? (SUBCATEGORIES[industry as keyof typeof SUBCATEGORIES]?.options ?? [])
      : [];
    return options.find((o) => o.id === value)?.label ?? value;
  }
  if (field === 'owner.role') {
    const q = QUESTIONS.find((x) => x.field === field);
    return q?.options?.(state.known).find((o) => o.id === value)?.label ?? value;
  }
  return value;
}

/** Everything Mitra holds but the owner has not confirmed yet, for the review step. */
export function unconfirmed(state: EngineState): DraftFieldPath[] {
  return (Object.keys(state.suggestions ?? {}) as DraftFieldPath[]).filter(
    (field) => state.known[field] === undefined
  );
}

export { resolve };
