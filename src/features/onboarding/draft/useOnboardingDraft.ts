'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  asString,
  DEPENDENT_FIELDS,
  type DraftFieldPath,
  type FactValue,
  type Known,
  type Suggestions,
} from '../engine/fields';
import { getFirebaseAuth } from '@/lib/firebase/client';
import {
  confirmOnboarding,
  discoverFacts,
  loadDraft,
  saveDraft,
  type ConfirmResult,
  type DraftView,
} from './draftService';
import { SaveQueue, type Patch, type PatchStore, type SaveStatus } from './saveQueue';

const sameValue = (a: FactValue | undefined, b: FactValue | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);

const storeFor = (uid: string): PatchStore => {
  const key = `mitra-onboarding-pending:${uid}`;
  return {
    load: () => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Patch) : null;
      } catch {
        return null; // private mode / blocked storage: just no offline mirror
      }
    },
    save: (patch) => {
      try {
        if (patch) window.localStorage.setItem(key, JSON.stringify(patch));
        else window.localStorage.removeItem(key);
      } catch {
        /* storage unavailable — the in-memory queue still retries */
      }
    },
  };
};

/** What Mitra needs to know before a free discovery pass is worth running. */
const discoveryInputs = (known: Known): string | null => {
  const parts = [
    asString(known['identity.industry']),
    asString(known['identity.subcategory']),
    asString(known['identity.name']),
    asString(known['identity.city']),
  ];
  return parts.every(Boolean) ? parts.join('|') : null;
};

export interface OnboardingDraftApi {
  loading: boolean;
  loadError: boolean;
  /** Confirmed by the owner. */
  known: Known;
  /** Mitra's unconfirmed guesses/detections: offered as suggestions, never treated as known. */
  suggestions: Suggestions;
  skipped: ReadonlySet<DraftFieldPath>;
  welcomed: boolean;
  /** True when we loaded a draft that already had answers — i.e. the owner is coming back. */
  resumed: boolean;
  saveStatus: SaveStatus;
  /** Another tab/device changed this conversation; we refreshed from the latest. */
  staleNotice: boolean;
  dismissStaleNotice: () => void;
  /**
   * The status the SERVER has acknowledged. `ready_for_review` means the server accepted that the
   * review is showing — the only state in which confirming is allowed.
   */
  serverStatus: DraftView['status'];
  /** Set once the business has been created. */
  businessId: string | undefined;
  /** Tell the server the review is on screen (it verifies the draft really is reviewable). */
  markReviewShown: () => void;
  /** Create the business from exactly what the owner reviewed. Never throws. */
  confirm: () => Promise<ConfirmResult>;
  answer: (values: Partial<Record<DraftFieldPath, FactValue>>) => void;
  skip: (paths: DraftFieldPath[]) => void;
  markWelcomed: () => void;
  retrySave: () => void;
}

/**
 * The owner's onboarding draft: loaded from onboarding_drafts/{uid}, updated optimistically so the
 * conversation never waits on the network, and persisted per answered question through a
 * coalescing queue. Refresh, logout and browser close all resume from the saved draft; an answer
 * that could not be sent yet is mirrored to localStorage and delivered on the next load.
 *
 * Once Mitra knows what the business is and where, it asks the server (free, no credits) for
 * suggestions. That is strictly best-effort: if it fails, times out or returns nothing, the
 * conversation simply carries on with its built-in options and the owner never sees an error.
 */
export function useOnboardingDraft(uid: string | null): OnboardingDraftApi {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [known, setKnown] = useState<Known>({});
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [skipped, setSkipped] = useState<ReadonlySet<DraftFieldPath>>(new Set());
  const [welcomed, setWelcomed] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [staleNotice, setStaleNotice] = useState(false);
  const [serverStatus, setServerStatus] = useState<DraftView['status']>('in_progress');
  const [businessId, setBusinessId] = useState<string | undefined>(undefined);
  const queue = useRef<SaveQueue | null>(null);
  const revision = useRef<number | undefined>(undefined);
  const discoveredFor = useRef<string | null>(null);
  // Not an effect-scoped flag: a discovery call must survive the owner answering the next question
  // (which re-runs the effect below); only leaving the page should discard its result.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    const adopt = (view: DraftView, unsent: Patch) => {
      const nextKnown: Known = { ...view.known, ...unsent.updates };
      const nextSkipped = new Set<DraftFieldPath>(view.skipped);
      for (const path of Object.keys(unsent.updates) as DraftFieldPath[]) nextSkipped.delete(path);
      unsent.skip.forEach((p) => nextSkipped.add(p));
      setKnown(nextKnown);
      setSkipped(nextSkipped);
      setSuggestions(view.suggestions);
      return nextKnown;
    };

    const q = new SaveQueue(
      async (patch) => {
        const { draft, stale } = await saveDraft(patch, revision.current);
        revision.current = draft.revision;
        if (!cancelled) {
          setServerStatus(draft.status);
          if (draft.businessId) setBusinessId(draft.businessId);
        }
        if (stale && !cancelled) {
          // Another tab wrote in between. Nothing was lost (per-field last write wins), but what
          // we are showing is out of date: adopt the latest, then say so.
          adopt(draft, q.peek);
          setStaleNotice(true);
        }
      },
      setSaveStatus,
      storeFor(uid)
    );
    queue.current = q;

    void (async () => {
      try {
        const draft = await loadDraft(uid);
        if (cancelled) return;

        revision.current = draft?.revision;
        setServerStatus(draft?.status ?? 'in_progress');
        setBusinessId(draft?.businessId);
        const unsent = q.peek;
        const nextKnown = adopt(
          draft ?? {
            known: {},
            suggestions: {},
            skipped: [],
            welcomed: false,
            status: 'in_progress',
            revision: 0,
          },
          unsent
        );
        setWelcomed((draft?.welcomed ?? false) || unsent.welcomed === true);
        setResumed(Object.keys(nextKnown).length > 0);
        setLoadError(false);
        void q.flush();
      } catch (error) {
        console.error('Loading onboarding draft failed', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onOnline = () => void q.flush();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [uid]);

  // Free discovery. Waits until the answers it depends on have actually reached the server
  // (the server reads the saved draft), and runs once per distinct set of inputs.
  useEffect(() => {
    if (loading || loadError || saveStatus !== 'idle') return;
    const q = queue.current;
    if (!q || q.isBusy) return;
    const inputs = discoveryInputs(known);
    if (!inputs || discoveredFor.current === inputs) return;
    discoveredFor.current = inputs;

    void (async () => {
      try {
        const result = await discoverFacts();
        if (!mounted.current) return;
        if (result.revision !== undefined) revision.current = result.revision;
        if (result.status === 'completed' && result.suggestions) {
          // Only unconfirmed guesses ever come back; confirmed answers are never touched.
          setSuggestions((prev) => ({ ...prev, ...result.suggestions }));
        }
      } catch (error) {
        // By design invisible to the owner: the conversation works without suggestions.
        console.warn('Onboarding discovery unavailable', error);
      }
    })();
  }, [known, loading, loadError, saveStatus]);

  const answer = useCallback((values: Partial<Record<DraftFieldPath, FactValue>>) => {
    const entries = Object.entries(values) as Array<[DraftFieldPath, FactValue]>;
    setKnown((prev) => {
      const next: Known = { ...prev, ...values };
      for (const [path, value] of entries) {
        // Changing an answer discards what was built on it (matches the server).
        if (prev[path] !== undefined && !sameValue(prev[path], value)) {
          for (const dep of DEPENDENT_FIELDS[path] ?? []) if (!(dep in values)) delete next[dep];
        }
      }
      return next;
    });
    setSkipped((prev) => {
      const next = new Set(prev);
      for (const [path] of entries) next.delete(path);
      return next;
    });
    // Confirming a suggestion turns it into a fact: it stops being a "guess" for that field.
    setSuggestions((prev) => {
      const next = { ...prev };
      for (const [path] of entries) delete next[path];
      return next;
    });
    void queue.current?.enqueue({ updates: values });
  }, []);

  const skip = useCallback((paths: DraftFieldPath[]) => {
    setSkipped((prev) => new Set([...prev, ...paths]));
    void queue.current?.enqueue({ skip: paths });
  }, []);

  const markWelcomed = useCallback(() => {
    setWelcomed(true);
    void queue.current?.enqueue({ welcomed: true });
  }, []);

  const markReviewShown = useCallback(() => {
    void queue.current?.enqueue({ reviewShown: true });
  }, []);

  const confirm = useCallback(async (): Promise<ConfirmResult> => {
    const reviewed = revision.current;
    if (reviewed === undefined) {
      return {
        ok: false,
        reason: 'failed',
        message: "I couldn't set that up just now. Nothing is lost. Please try again.",
      };
    }
    const result = await confirmOnboarding(reviewed);
    if (!mounted.current) return result;

    if (result.ok) {
      // The new business is added to the owner's sign-in claims on the server; fetch a fresh token
      // now so their first write on the dashboard is not refused until they next sign in.
      try {
        await getFirebaseAuth()?.currentUser?.getIdToken(true);
      } catch (error) {
        console.error('Token refresh after onboarding failed', error);
      }
      setBusinessId(result.businessId);
      setServerStatus('completed');
    } else if (result.reason === 'changed' && uid) {
      // Something moved on since they reviewed: show them the latest so they review THAT.
      try {
        const latest = await loadDraft(uid);
        if (latest && mounted.current) {
          revision.current = latest.revision;
          setKnown(latest.known);
          setSkipped(new Set(latest.skipped));
          setSuggestions(latest.suggestions);
          setServerStatus(latest.status);
        }
      } catch (error) {
        console.error('Reloading onboarding draft failed', error);
      }
    }
    return result;
  }, [uid]);

  const retrySave = useCallback(() => void queue.current?.flush(), []);
  const dismissStaleNotice = useCallback(() => setStaleNotice(false), []);

  return {
    loading,
    loadError,
    known,
    suggestions,
    skipped,
    welcomed,
    resumed,
    saveStatus,
    staleNotice,
    dismissStaleNotice,
    serverStatus,
    businessId,
    markReviewShown,
    confirm,
    answer,
    skip,
    markWelcomed,
    retrySave,
  };
}
