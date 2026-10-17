'use client';

import { useEffect, useState } from 'react';
import { callFunction } from '@/services/api';

/**
 * The experiment variant for the signed-in user, or 'control' whenever anything is uncertain: not signed in, no
 * running experiment, a failed request, or a variant this build does not know. The page therefore always renders
 * a complete, truthful experience; an experiment can only ever change presentation.
 *
 * The server owns assignment (stable per user, persisted, only for experiments set running in the reviewed
 * registry). This hook only reads the result, once per page load, and never sends or receives a price or credit.
 */
let inFlight: Promise<Record<string, string>> | null = null;

function fetchAssignments(): Promise<Record<string, string>> {
  if (!inFlight) {
    inFlight = callFunction<Record<string, never>, { assignments: Record<string, string> }>({
      functionName: 'getExperimentAssignments',
      data: {},
    })
      .then((r) => (r && typeof r.assignments === 'object' && r.assignments ? r.assignments : {}))
      .catch(() => ({}));
  }
  return inFlight;
}

/** Test helper: forget the cached request. */
export function resetExperimentCache(): void {
  inFlight = null;
}

export function useExperiment<V extends string>(
  experimentId: string,
  known: readonly V[],
  enabled: boolean
): V | 'control' {
  const [variant, setVariant] = useState<V | 'control'>('control');
  useEffect(() => {
    if (!enabled) {
      setVariant('control');
      return;
    }
    let cancelled = false;
    void fetchAssignments().then((assignments) => {
      if (cancelled) return;
      const v = assignments[experimentId];
      setVariant(v && (known as readonly string[]).includes(v) ? (v as V) : 'control');
    });
    return () => {
      cancelled = true;
    };
    // `known` is a constant list at the call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId, enabled]);
  return variant;
}
