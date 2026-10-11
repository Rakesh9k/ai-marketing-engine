import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * A record of every model call made while one campaign was generated: which stage asked, which model answered,
 * which attempt it was, whether it was a schema repair, how long it took, and why it failed validation. It answers
 * "where does the time go" and "why were there repairs" from data, and is stored with the campaign.
 *
 * AsyncLocalStorage carries it, so no function signature changes and concurrent campaigns (and the concurrent
 * validation stages within one campaign) cannot mix their records.
 */
export interface AiCallRecord {
  stage: string;
  model: string;
  /** 0 for the first call of a request, 1.. for each repair. */
  attempt: number;
  repair: boolean;
  ok: boolean;
  ms: number;
  /** Why the response was rejected (first validation issue / "not valid JSON" / the provider error). */
  problem?: string;
}

interface Store {
  stage: string;
  calls: AiCallRecord[];
}

const storage = new AsyncLocalStorage<Store>();

/** Run `fn` with a fresh call log. Everything it awaits records into that log. */
export function withAiCallLog<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ stage: 'unassigned', calls: [] }, fn);
}

/** The calls recorded so far for the current campaign (empty outside withAiCallLog). */
export function aiCallsSoFar(): readonly AiCallRecord[] {
  return storage.getStore()?.calls ?? [];
}

/** Attribute the calls that follow, in this async flow, to a stage. */
export function setAiCallStage(stage: string): void {
  const store = storage.getStore();
  if (store) store.stage = stage;
}

/** Run `fn` attributing its calls to `stage`, without disturbing concurrent flows (parallel stages). */
export function inAiCallStage<T>(stage: string, fn: () => Promise<T>): Promise<T> {
  const store = storage.getStore();
  if (!store) return fn();
  return storage.run({ stage, calls: store.calls }, fn);
}

export function recordAiCall(record: Omit<AiCallRecord, 'stage'>): void {
  const store = storage.getStore();
  if (store) store.calls.push({ stage: store.stage, ...record });
}

export interface AiCallSummary {
  total: number;
  repairs: number;
  failed: number;
  totalMs: number;
  byStage: Record<string, { calls: number; repairs: number; ms: number }>;
}

export function summarizeAiCalls(calls: readonly AiCallRecord[]): AiCallSummary {
  const byStage: AiCallSummary['byStage'] = {};
  for (const c of calls) {
    const s = (byStage[c.stage] ??= { calls: 0, repairs: 0, ms: 0 });
    s.calls++;
    if (c.repair) s.repairs++;
    s.ms += c.ms;
  }
  return {
    total: calls.length,
    repairs: calls.filter((c) => c.repair).length,
    failed: calls.filter((c) => !c.ok).length,
    totalMs: calls.reduce((sum, c) => sum + c.ms, 0),
    byStage,
  };
}
