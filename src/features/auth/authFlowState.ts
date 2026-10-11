'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tracks "a sign-in/sign-up is still mid-flight" (Google popup, new-user consent step, consent
 * recording after email signup).
 *
 * Why this exists: Firebase flips auth state to "authenticated" the moment the credential exists,
 * which is BEFORE a new user has accepted the Terms. PublicOnlyRoute reacts to that by unmounting
 * its children and redirecting, so the Google consent card (rendered inside those children) was
 * torn down before the user could ever see or accept it. Routes that redirect on auth state wait
 * until this flag clears.
 */
let activeFlows = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Marks a flow as started. Returns an idempotent release function. */
export function beginAuthFlow(): () => void {
  let released = false;
  activeFlows += 1;
  emit();
  return () => {
    if (released) return;
    released = true;
    activeFlows = Math.max(0, activeFlows - 1);
    emit();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuthFlowBusy(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => activeFlows > 0,
    () => false
  );
}
