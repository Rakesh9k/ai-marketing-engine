import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import { callFunction } from '@/services/api';
import {
  DRAFT_FIELD_PATHS,
  decodePath,
  type DraftFieldPath,
  type FactValue,
  type Known,
  type Suggestions,
} from '../engine/fields';
import type { Patch } from './saveQueue';

export interface DraftView {
  /** Confirmed by the owner. */
  known: Known;
  /** Found or guessed by Mitra, not confirmed. */
  suggestions: Suggestions;
  skipped: DraftFieldPath[];
  welcomed: boolean;
  status: 'in_progress' | 'ready_for_review' | 'completed';
  revision: number;
  /** Set once the business has been created from this draft. */
  businessId?: string;
}

const isPath = (p: string): p is DraftFieldPath =>
  (DRAFT_FIELD_PATHS as readonly string[]).includes(p);

const isFactValue = (v: unknown): v is FactValue =>
  typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string'));

interface RawDraft {
  facts?: Record<string, { value?: unknown; confirmed?: boolean; source?: string }>;
  skipped?: string[];
  welcomed?: boolean;
  status?: DraftView['status'];
  revision?: number;
  businessId?: string;
}

/**
 * Splits a stored draft into what the owner confirmed and what Mitra only guessed. A guess is
 * never returned as `known`: the same document can hold both, and mixing them up would let an AI
 * suggestion silently count as something the owner said.
 */
export function viewFromDraft(data: RawDraft): DraftView {
  const known: Known = {};
  const suggestions: Suggestions = {};
  for (const [key, fact] of Object.entries(data.facts ?? {})) {
    const path = decodePath(key);
    if (!isPath(path) || !isFactValue(fact.value)) continue;
    if (fact.confirmed) known[path] = fact.value;
    else if (fact.source && fact.source !== 'UNKNOWN') suggestions[path] = fact.value;
  }
  return {
    known,
    suggestions,
    skipped: (data.skipped ?? []).filter(isPath),
    welcomed: data.welcomed === true,
    status: data.status ?? 'in_progress',
    revision: data.revision ?? 0,
    businessId: data.businessId,
  };
}

/**
 * Reads onboarding_drafts/{uid} (Firestore rules: owner-read only; the callables are the only
 * writers).
 */
export async function loadDraft(uid: string): Promise<DraftView | null> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');

  const snap = await getDoc(doc(db, 'onboarding_drafts', uid));
  return snap.exists() ? viewFromDraft(snap.data() as RawDraft) : null;
}

export interface SaveResult {
  draft: DraftView;
  /** Another tab/device saved since this one last looked. The save still went through. */
  stale: boolean;
}

/** Sends one coalesced patch. Throws on failure so the queue keeps it pending. */
export async function saveDraft(
  patch: Patch,
  baseRevision: number | undefined
): Promise<SaveResult> {
  const res = await callFunction<
    {
      updates: Array<{ path: string; value: FactValue }>;
      skip: string[];
      welcomed?: boolean;
      reviewShown?: boolean;
      baseRevision?: number;
    },
    { draft: RawDraft; stale: boolean }
  >({
    functionName: 'saveOnboardingDraft',
    data: {
      updates: Object.entries(patch.updates).map(([path, value]) => ({
        path,
        value: value as FactValue,
      })),
      skip: patch.skip,
      ...(patch.welcomed ? { welcomed: true } : {}),
      ...(patch.reviewShown ? { reviewShown: true } : {}),
      ...(baseRevision !== undefined ? { baseRevision } : {}),
    },
  });
  return { draft: viewFromDraft(res.draft), stale: res.stale === true };
}

export type DiscoveryStatus = 'completed' | 'cached' | 'unavailable' | 'not_ready';

export interface DiscoveryResult {
  status: DiscoveryStatus;
  revision?: number;
  suggestions?: Suggestions;
}

/**
 * Asks Mitra for free suggestions based on what the owner has confirmed. Best-effort by design:
 * callers treat any failure as "no suggestions" — it must never surface as an error to the owner.
 */
export async function discoverFacts(): Promise<DiscoveryResult> {
  return callFunction<Record<string, never>, DiscoveryResult>({
    functionName: 'discoverOnboardingFacts',
    data: {},
    timeoutMs: 25_000,
  });
}

export type ConfirmFailure =
  | 'changed' // the answers changed since the owner reviewed them
  | 'not_reviewed'
  | 'incomplete'
  | 'invalid'
  | 'limit' // the plan's business limit
  | 'email_not_verified'
  | 'failed';

export type ConfirmResult =
  { ok: true; businessId: string } | { ok: false; reason: ConfirmFailure; message: string };

const FAILURE_FOR_CODE: Record<string, ConfirmFailure> = {
  ONBOARDING_DRAFT_CHANGED: 'changed',
  ONBOARDING_REVIEW_REQUIRED: 'not_reviewed',
  ONBOARDING_NO_DRAFT: 'incomplete',
  ONBOARDING_INCOMPLETE: 'incomplete',
  ONBOARDING_INVALID: 'invalid',
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  BUSINESS_LIMIT_REACHED: 'limit',
};

const FRIENDLY: Record<ConfirmFailure, string> = {
  changed: 'Your answers changed since you looked at them, so please have another look.',
  not_reviewed: 'Please look over your answers first.',
  incomplete: 'A few answers are still missing.',
  invalid: 'Something in your answers needs another look.',
  limit: 'Your plan includes one business. You already have one set up.',
  email_not_verified: 'Please verify your email address first, then try again.',
  failed: "I couldn't set that up just now. Nothing is lost. Please try again.",
};

/** Turns a callable error into something the owner can act on, never a raw technical message. */
export function explainConfirmError(error: unknown): { reason: ConfirmFailure; message: string } {
  const e = error as { details?: { code?: string }; message?: string } | undefined;
  const reason =
    FAILURE_FOR_CODE[e?.details?.code ?? ''] ??
    (/business profile/i.test(e?.message ?? '') ? 'limit' : 'failed');
  return { reason, message: FRIENDLY[reason] };
}

/**
 * Creates the business from the draft the owner just reviewed. The server reads the draft itself; the
 * only thing sent is which revision was reviewed, so what gets created is exactly what was shown.
 */
export async function confirmOnboarding(reviewedRevision: number): Promise<ConfirmResult> {
  try {
    const res = await callFunction<{ reviewedRevision: number }, { businessId: string }>({
      functionName: 'confirmOnboardingBusiness',
      data: { reviewedRevision },
      timeoutMs: 30_000,
    });
    return { ok: true, businessId: res.businessId };
  } catch (error) {
    return { ok: false, ...explainConfirmError(error) };
  }
}
