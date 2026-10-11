import {
  DEPENDENT_FIELDS,
  DRAFT_FIELDS,
  INDUSTRY_TO_VERTICAL,
  REQUIRED_FIELDS,
  isDraftFieldPath,
  type DraftFieldPath,
  type Industry,
} from './draftFields';
import type { BusinessCategory } from '../types';

/**
 * Where a fact came from. The rule that matters: an AI guess never becomes a fact on its own.
 *   USER_CONFIRMED  the owner said it (or confirmed a suggestion)
 *   AI_DETECTED     read directly from something the owner supplied (their Google profile, a logo)
 *   AI_INFERRED     a guess derived from other facts
 *   UNKNOWN         placeholder; carries no value
 */
export type KnowledgeSource = 'USER_CONFIRMED' | 'AI_DETECTED' | 'AI_INFERRED' | 'UNKNOWN';

export interface KnowledgeEntry {
  value: unknown;
  source: KnowledgeSource;
  /** 0..1. User answers are 1. */
  confidence: number;
  confirmed: boolean;
  updatedAt: string;
}

/** Server-set record of the free AI discovery pass (never client-writable). */
export interface DiscoveryMeta {
  /** Hash of the inputs the pass ran on, so identical inputs are never paid for twice. */
  key: string;
  status: 'completed' | 'failed';
  at: string;
}

export interface OnboardingDraft {
  uid: string;
  schemaVersion: 1;
  status: 'in_progress' | 'ready_for_review' | 'completed';
  /** The owner has seen the welcome screen; resuming users skip it. */
  welcomed: boolean;
  /** Keyed by encoded path (see encodePath) — Firestore map keys stay dot-free. */
  facts: Record<string, KnowledgeEntry>;
  /** Paths the owner chose to skip, so we don't ask again. */
  skipped: string[];
  discovery?: DiscoveryMeta;
  /** Set once the business has been created from this draft. */
  businessId?: string;
  completedAt?: string;
  /** Bumps on every write; lets a second tab notice it is behind. */
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export const MAX_UPDATES_PER_SAVE = 20;

/** 'owner.name' <-> 'owner__name'. Dots in map keys are legal but awkward in rules and updates. */
export const encodePath = (path: string): string => path.replace(/\./g, '__');
export const decodePath = (key: string): string => key.replace(/__/g, '.');

export function newDraft(uid: string, now: string): OnboardingDraft {
  return {
    uid,
    schemaVersion: 1,
    status: 'in_progress',
    welcomed: false,
    facts: {},
    skipped: [],
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const AI_SOURCES: KnowledgeSource[] = ['AI_DETECTED', 'AI_INFERRED'];

/**
 * Decides whether `incoming` may replace `existing`. Pure; used for user answers and for AI
 * discovery, so the "AI never overwrites confirmed truth" rule lives in exactly one place.
 */
export function mergeFact(
  existing: KnowledgeEntry | undefined,
  incoming: KnowledgeEntry
): KnowledgeEntry {
  if (!existing) return incoming;

  // The owner always wins, including over their own earlier answer (they may be correcting it).
  if (incoming.source === 'USER_CONFIRMED') return incoming;

  // Nothing automatic may replace something the owner confirmed.
  if (existing.confirmed || existing.source === 'USER_CONFIRMED') return existing;

  // A detection (read from their material) beats an inference (a guess).
  if (existing.source === 'AI_DETECTED' && incoming.source === 'AI_INFERRED') return existing;

  // Otherwise keep the more confident automatic value; ties go to the newer one.
  if (AI_SOURCES.includes(existing.source) && incoming.confidence < existing.confidence) {
    return existing;
  }
  return incoming;
}

export interface UserAnswerInput {
  updates?: Array<{ path: string; value?: unknown }>;
  skip?: string[];
  welcomed?: boolean;
  /**
   * The owner is looking at the review screen. Only honoured when the draft really is reviewable
   * (every required fact confirmed); moves it to `ready_for_review` and records the funnel step.
   */
  reviewShown?: boolean;
}

export class DraftValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftValidationError';
  }
}

/** Removes the facts that were built on `path`, plus any pending skip of them. */
function clearDependents(
  path: DraftFieldPath,
  facts: Record<string, KnowledgeEntry>,
  skipped: Set<string>,
  keep: ReadonlySet<string> = new Set()
) {
  for (const dependent of DEPENDENT_FIELDS[path] ?? []) {
    if (keep.has(dependent)) continue;
    delete facts[encodePath(dependent)];
    skipped.delete(dependent);
  }
}

/**
 * Applies the owner's answers to a draft and returns the next draft. Pure (no I/O, takes `now`),
 * so the callable is a thin transaction around it and every rule is unit-tested.
 *
 * Clients can only ever submit USER_CONFIRMED facts: source/confidence/confirmed are set here,
 * never read from the request, so a caller cannot forge an AI or "confirmed" label.
 */
export function applyUserAnswers(
  existing: OnboardingDraft | null,
  uid: string,
  input: UserAnswerInput,
  now: string
): OnboardingDraft {
  const base = existing ?? newDraft(uid, now);
  if (base.uid !== uid) throw new DraftValidationError('Draft belongs to a different user');
  if (base.status === 'completed') throw new DraftValidationError('Onboarding is already complete');

  const updates = input.updates ?? [];
  if (updates.length > MAX_UPDATES_PER_SAVE) {
    throw new DraftValidationError('Too many updates in one save');
  }

  const facts = { ...base.facts };
  const skipped = new Set(base.skipped);
  const updatedPaths = new Set<string>();
  const changedPaths: DraftFieldPath[] = [];

  for (const { path, value } of updates) {
    if (!isDraftFieldPath(path)) throw new DraftValidationError(`Unknown field: ${path}`);
    const parsed = DRAFT_FIELDS[path].safeParse(value);
    if (!parsed.success) throw new DraftValidationError(`Invalid value for ${path}`);

    const key = encodePath(path);
    const before = facts[key];
    // Only a *confirmed* earlier answer being changed invalidates what was built on it; replacing
    // an unconfirmed AI guess with the owner's answer should not discard their other answers.
    if (before?.confirmed && !sameValue(before.value, parsed.data)) changedPaths.push(path);
    facts[key] = mergeFact(before, {
      value: parsed.data,
      source: 'USER_CONFIRMED',
      confidence: 1,
      confirmed: true,
      updatedAt: now,
    });
    updatedPaths.add(path);
    skipped.delete(path); // answering after skipping un-skips
  }

  // Changing an answer invalidates what was built on it: a "Cloud Kitchen" subcategory must not
  // survive the owner switching industry to Salon. Unless they re-answered it in the same save.
  for (const path of changedPaths) clearDependents(path, facts, skipped, updatedPaths);

  for (const path of input.skip ?? []) {
    if (!isDraftFieldPath(path)) throw new DraftValidationError(`Unknown field: ${path}`);
    // Skipping never discards an answer the owner already confirmed.
    if (!facts[encodePath(path)]?.confirmed) skipped.add(path);
  }

  // Changing anything after the owner saw the review means they must review the new version.
  const changedSomething = updatedPaths.size > 0 || (input.skip?.length ?? 0) > 0;
  const next: OnboardingDraft = {
    ...base,
    status: changedSomething && base.status === 'ready_for_review' ? 'in_progress' : base.status,
    welcomed: base.welcomed || input.welcomed === true,
    facts,
    skipped: [...skipped].sort(),
    revision: base.revision + 1,
    updatedAt: now,
  };
  if (input.reviewShown === true && normalizeDraft(next).ready) {
    next.status = 'ready_for_review';
  }
  return next;
}

/** Hard ceilings on how sure a *guess* may claim to be, so it can never pass for near-certainty. */
const MAX_CONFIDENCE: Partial<Record<KnowledgeSource, number>> = {
  AI_INFERRED: 0.7,
  AI_DETECTED: 0.95,
};

export interface SystemFact {
  path: string;
  value: unknown;
  source: 'AI_DETECTED' | 'AI_INFERRED';
  confidence: number;
}

/**
 * Applies facts Mitra found or guessed (never the owner). Same registry validation as an answer,
 * the same `mergeFact` rule — so a guess can never replace something the owner confirmed — and a
 * confidence ceiling. An invalid or unknown fact is dropped, not fatal: discovery is best-effort
 * and must never be the reason an owner's onboarding breaks.
 */
export function applySystemFacts(
  draft: OnboardingDraft,
  facts: SystemFact[],
  now: string
): OnboardingDraft {
  const next = { ...draft.facts };
  for (const fact of facts) {
    if (!isDraftFieldPath(fact.path)) continue;
    const parsed = DRAFT_FIELDS[fact.path].safeParse(fact.value);
    if (!parsed.success) continue;
    const key = encodePath(fact.path);
    next[key] = mergeFact(next[key], {
      value: parsed.data,
      source: fact.source,
      confidence: Math.max(0, Math.min(fact.confidence, MAX_CONFIDENCE[fact.source] ?? 0)),
      confirmed: false,
      updatedAt: now,
    });
  }
  return { ...draft, facts: next, revision: draft.revision + 1, updatedAt: now };
}

/** path -> value for facts we can rely on (confirmed by the owner). */
export function confirmedValues(draft: OnboardingDraft): Partial<Record<DraftFieldPath, unknown>> {
  const out: Partial<Record<DraftFieldPath, unknown>> = {};
  for (const [key, entry] of Object.entries(draft.facts)) {
    const path = decodePath(key);
    if (isDraftFieldPath(path) && entry.confirmed) out[path] = entry.value;
  }
  return out;
}

/** Unconfirmed guesses/detections, offered to the owner as suggestions — never treated as known. */
export function suggestedValues(draft: OnboardingDraft): Partial<Record<DraftFieldPath, unknown>> {
  const out: Partial<Record<DraftFieldPath, unknown>> = {};
  for (const [key, entry] of Object.entries(draft.facts)) {
    const path = decodePath(key);
    if (isDraftFieldPath(path) && !entry.confirmed && entry.source !== 'UNKNOWN') {
      out[path] = entry.value;
    }
  }
  return out;
}

export interface NormalizedDraft {
  owner: { name?: string; role?: string };
  identity: {
    industry?: Industry;
    subcategory?: string;
    name?: string;
    city?: string;
    state?: string;
    /** The campaign-generation vertical this industry maps to, or null if none exists yet. */
    vertical: BusinessCategory | null;
  };
  contact: { whatsapp?: string };
  offering: { signature?: string[] };
  audience: { primary?: string[] };
  positioning: { usp?: string };
  /** Required facts still missing before a business could be created from this draft. */
  missing: DraftFieldPath[];
  /** True when nothing required is missing — the draft may go to the owner for review. */
  ready: boolean;
  /**
   * Paths holding a guess the owner has not confirmed. The review step must show these as
   * suggestions to confirm or drop; they are NOT part of the normalized values above.
   */
  unconfirmed: DraftFieldPath[];
}

/**
 * Draft -> the shape of the Business Brain slots it feeds. This is the single normalization step
 * between "what the owner told us" and `businessBrain`. It is NOT a path to `createBusiness` by
 * itself: Phase H sends its output to the owner for review first, and only an owner-confirmed
 * review creates the business. Only confirmed facts are read, so an unconfirmed AI guess cannot
 * leak into the Brain.
 */
export function normalizeDraft(draft: OnboardingDraft): NormalizedDraft {
  const known = confirmedValues(draft);
  const industry = known['identity.industry'] as Industry | undefined;
  const missing = REQUIRED_FIELDS.filter((p) => known[p] === undefined);

  return {
    owner: {
      name: known['owner.name'] as string | undefined,
      role: known['owner.role'] as string | undefined,
    },
    identity: {
      industry,
      subcategory: known['identity.subcategory'] as string | undefined,
      name: known['identity.name'] as string | undefined,
      city: known['identity.city'] as string | undefined,
      state: known['identity.state'] as string | undefined,
      vertical: industry ? INDUSTRY_TO_VERTICAL[industry] : null,
    },
    contact: { whatsapp: known['contact.whatsapp'] as string | undefined },
    offering: { signature: known['offering.signature'] as string[] | undefined },
    audience: { primary: known['audience.primary'] as string[] | undefined },
    positioning: { usp: known['positioning.usp'] as string | undefined },
    missing,
    ready: missing.length === 0,
    unconfirmed: Object.keys(suggestedValues(draft)) as DraftFieldPath[],
  };
}

export interface OnboardingEvent {
  /** Deterministic: the same milestone is recorded once per owner, however often it is re-saved. */
  id: string;
  name: string;
  metadata: Record<string, unknown>;
}

/** Fields whose answer is a taxonomy id (safe to log). Anything else is the owner's own words. */
const LOGGABLE_VALUE_FIELDS: DraftFieldPath[] = ['identity.industry', 'owner.role'];

/**
 * The funnel milestones a save crossed: started -> answered each field -> industry/subcategory.
 * Computed from the draft before/after on the server, so the funnel cannot be spoofed from the
 * browser, and each milestone fires once per owner. "Abandoned" is deliberately not an event
 * (a browser cannot reliably report that it has gone away): it is derived by looking for owners
 * with `onboarding_started` and no `onboarding_complete`, and reading their last answered field.
 *
 * Never carries free text: for fields that hold the owner's own words only `isCustom`/the field
 * name are recorded, not the value.
 */
export function deriveOnboardingEvents(
  before: OnboardingDraft | null,
  after: OnboardingDraft,
  input: UserAnswerInput
): OnboardingEvent[] {
  const uid = after.uid;
  const events: OnboardingEvent[] = [];

  if (!before) {
    events.push({ id: `${uid}_onboarding_started`, name: 'onboarding_started', metadata: {} });
  }

  for (const { path } of input.updates ?? []) {
    if (!isDraftFieldPath(path)) continue;
    const key = encodePath(path);
    const wasConfirmed = before?.facts[key]?.confirmed === true;
    if (wasConfirmed) continue; // a correction is not a new milestone

    const entry = after.facts[key];
    const metadata: Record<string, unknown> = { field: path };
    if (LOGGABLE_VALUE_FIELDS.includes(path)) metadata['value'] = entry?.value;

    events.push({
      id: `${uid}_onboarding_answered_${key}`,
      name: 'onboarding_answered',
      metadata,
    });
    if (path === 'identity.industry') {
      events.push({
        id: `${uid}_onboarding_industry_selected`,
        name: 'onboarding_industry_selected',
        metadata: { industry: entry?.value },
      });
    }
    if (path === 'identity.subcategory') {
      const industry = after.facts[encodePath('identity.industry')]?.value;
      events.push({
        id: `${uid}_onboarding_subcategory_selected`,
        name: 'onboarding_subcategory_selected',
        // Preset ids are taxonomy; anything the owner typed is only flagged, never logged.
        metadata: { industry, isCustom: /[^a-z_]/.test(String(entry?.value ?? '')) },
      });
    }
  }

  if (before?.status !== 'ready_for_review' && after.status === 'ready_for_review') {
    events.push({
      id: `${uid}_onboarding_review_shown`,
      name: 'onboarding_review_shown',
      metadata: {},
    });
  }

  for (const path of input.skip ?? []) {
    if (!isDraftFieldPath(path)) continue;
    if (after.skipped.includes(path) && !before?.skipped.includes(path)) {
      events.push({
        id: `${uid}_onboarding_skipped_${encodePath(path)}`,
        name: 'onboarding_answered',
        metadata: { field: path, skipped: true },
      });
    }
  }

  return events;
}
