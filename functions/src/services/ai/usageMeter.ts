import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Hard-capped spend meter for LIVE provider runs (the opt-in *.live.test.ts harnesses). It exists so a budget is
 * ENFORCED by code, not merely written in a report:
 *
 *  - Inactive by default. When no meter is installed every provider call goes straight through, byte for byte as
 *    before, so production behaviour is unchanged.
 *  - Before a paid call starts, its WORST-CASE cost is reserved; if spent + reserved + that worst case would exceed
 *    the budget, the call is refused (the provider is never contacted). Reservations make the cap hold even when
 *    pipeline stages call the provider in parallel.
 *  - After a call, the cost is MEASURED from the provider's reported token usage. If usage is missing, the call is
 *    charged its conservative maximum: an unreported call is never assumed free. Failed calls are charged a
 *    configured fraction of the maximum (default 100%) because a timed-out or errored request may still be billed.
 *  - Every call is written to a ledger (provider, model, tokens, image calls, cost, source, latency, scenario).
 *  - Too many consecutive provider failures stop the run.
 *
 * The unit prices below are ASSUMPTIONS that must be confirmed against the provider's current price list before the
 * budget is approved (docs/audits/mitra-complete-audit/16-payment-architecture-and-live-ai-estimate.md).
 */

export type CallKind = 'text' | 'vision' | 'image';

export interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  /** Billed as output by Gemini. */
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

export interface ModelPrice {
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
  /** Worst-case cost of ONE call, reserved before it starts and charged when usage is not reported. */
  maxCallUsd: number;
}

export interface MeterConfig {
  budgetInr: number;
  usdToInr: number;
  /** Per exact model id; anything else uses `defaultPrice` (deliberately pessimistic). */
  prices: Record<string, ModelPrice>;
  defaultPrice: ModelPrice;
  /** Price when an image response reports no token usage (assumed per-image price). */
  imageFallbackUsd: number;
  /** Fraction of a call's max cost charged when the call FAILED (never assumed free). */
  failedCallChargeFraction: number;
  /** Stop the whole run after this many provider failures in a row. */
  maxConsecutiveFailures: number;
}

/**
 * Unit prices (USD per 1M tokens), taken from Google's Gemini API pricing page (PAID tier, Standard) on 2026-10-11
 * (page "last updated 2026-10-09 UTC"): https://ai.google.dev/gemini-api/docs/pricing . Re-verify before every
 * approved live run: prices and model lifecycles change (gemini-2.5-flash-image was shut down on 2026-10-02).
 *
 * maxCallUsd is the WORST-CASE cost of one call, derived from the request limits: text calls send at most
 * maxOutputTokens = 8192 and are budgeted for up to ~30,000 input tokens (input$ + 8192 x output$). A call that
 * actually reports MORE than this is still charged what it reports (the cap can then be overshot by the excess of a
 * single call), so keep a safety margin between the approved cap and the number you are prepared to lose.
 * USD->INR is set above the current rate on purpose.
 */
export const PRICES_VERIFIED_ON = '2026-10-11';
export const ASSUMED_LIVE_PRICES: MeterConfig = {
  budgetInr: 300,
  usdToInr: 90,
  prices: {
    // $0.25 in / $1.50 out (output includes thinking). 30k x 0.25/1e6 + 8192 x 1.5/1e6 = $0.0198
    'gemini-3.1-flash-lite': { inputPerMTokUsd: 0.25, outputPerMTokUsd: 1.5, maxCallUsd: 0.02 },
    // $0.30 in / $2.50 out. 30k x 0.30/1e6 + 8192 x 2.5/1e6 = $0.0295
    'gemini-3.5-flash-lite': { inputPerMTokUsd: 0.3, outputPerMTokUsd: 2.5, maxCallUsd: 0.03 },
    // Alias NOT listed on the price page; the 2026-10-05 benchmark found it resolves to gemini-3.5-flash-lite.
    'gemini-flash-lite-latest': { inputPerMTokUsd: 0.3, outputPerMTokUsd: 2.5, maxCallUsd: 0.03 },
    // Image models: $30 (lite) / $60 (flash) per 1M image output tokens; a 1K image is 1,120 tokens = $0.0336 /
    // $0.067. All reported output tokens are charged at the image rate (conservative: text tokens cost less).
    'gemini-3.1-flash-lite-image': {
      inputPerMTokUsd: 0.25,
      outputPerMTokUsd: 30,
      maxCallUsd: 0.05,
    },
    'gemini-3.1-flash-image': { inputPerMTokUsd: 0.5, outputPerMTokUsd: 60, maxCallUsd: 0.1 },
  },
  // Anything not listed above (including a shut-down or unknown model) is priced pessimistically.
  defaultPrice: { inputPerMTokUsd: 1.25, outputPerMTokUsd: 10, maxCallUsd: 0.1 },
  // Image call with no usage reported: at least the dearest listed 1K image.
  imageFallbackUsd: 0.07,
  failedCallChargeFraction: 1,
  maxConsecutiveFailures: 2,
};

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly spentInr: number,
    public readonly budgetInr: number
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export class RunStoppedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunStoppedError';
  }
}

export interface LedgerEntry {
  seq: number;
  scenario: string;
  /** Non-sensitive identifier only (e.g. a fixture campaign id). */
  campaignRef?: string;
  provider: 'gemini';
  kind: CallKind;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  imageCalls: number;
  costInr: number;
  /** 'measured' = from reported token usage; 'fallback' = conservative configured cost (usage missing / failed). */
  costSource: 'measured' | 'fallback';
  ok: boolean;
  ms: number;
  error?: string;
}

interface Context {
  scenario: string;
  campaignRef?: string;
}
const context = new AsyncLocalStorage<Context>();

/** Attribute every metered call made inside `fn` to a scenario (and optional fixture campaign reference). */
export function withMeterContext<T>(ctx: Context, fn: () => Promise<T>): Promise<T> {
  return context.run(ctx, fn);
}

export class UsageMeter {
  private spent = 0;
  private reserved = 0;
  private consecutiveFailures = 0;
  private seq = 0;
  private stopReason: string | null = null;
  readonly ledger: LedgerEntry[] = [];

  constructor(readonly config: MeterConfig) {}

  get spentInr(): number {
    return this.spent;
  }
  get remainingInr(): number {
    return this.config.budgetInr - this.spent - this.reserved;
  }
  get stopped(): string | null {
    return this.stopReason;
  }

  private price(model: string): ModelPrice {
    return this.config.prices[model] ?? this.config.defaultPrice;
  }
  private maxCostInr(model: string): number {
    return this.price(model).maxCallUsd * this.config.usdToInr;
  }

  /** Reserve a call's worst case, or refuse. Never contacts the provider. */
  begin(kind: CallKind, model: string): CallTicket {
    if (this.stopReason) throw new RunStoppedError(this.stopReason);
    const max = this.maxCostInr(model);
    if (this.spent + this.reserved + max > this.config.budgetInr + 1e-9) {
      this.stopReason = `budget of ₹${this.config.budgetInr} would be exceeded (spent ₹${this.spent.toFixed(2)}, reserved ₹${this.reserved.toFixed(2)}, next call may cost up to ₹${max.toFixed(2)})`;
      throw new BudgetExceededError(this.stopReason, this.spent, this.config.budgetInr);
    }
    this.reserved += max;
    return new CallTicket(this, kind, model, max, Date.now());
  }

  /** @internal */
  finish(
    t: { kind: CallKind; model: string; max: number; startedAt: number },
    ok: boolean,
    usage: GeminiUsage | undefined,
    error?: string
  ): void {
    this.reserved -= t.max;
    const p = this.price(t.model);
    const ctx = context.getStore();
    let costUsd: number;
    let source: 'measured' | 'fallback' = 'fallback';
    let inTok: number | null = null;
    let outTok: number | null = null;

    if (!ok) {
      costUsd = p.maxCallUsd * this.config.failedCallChargeFraction;
    } else if (usage && (usage.promptTokenCount != null || usage.candidatesTokenCount != null)) {
      inTok = usage.promptTokenCount ?? 0;
      outTok = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
      costUsd = (inTok * p.inputPerMTokUsd + outTok * p.outputPerMTokUsd) / 1e6;
      source = 'measured';
      // Never charge more than the reserved worst case without noticing: take the larger so a pricing mistake
      // can only make the meter MORE conservative.
      costUsd = Math.max(costUsd, 0);
    } else if (t.kind === 'image') {
      costUsd = this.config.imageFallbackUsd;
    } else {
      costUsd = p.maxCallUsd; // usage unreported: assume the worst, never free
    }

    const costInr = costUsd * this.config.usdToInr;
    this.spent += costInr;
    this.consecutiveFailures = ok ? 0 : this.consecutiveFailures + 1;
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures && !this.stopReason) {
      this.stopReason = `${this.consecutiveFailures} consecutive provider failures`;
    }
    this.ledger.push({
      seq: ++this.seq,
      scenario: ctx?.scenario ?? 'unattributed',
      ...(ctx?.campaignRef ? { campaignRef: ctx.campaignRef } : {}),
      provider: 'gemini',
      kind: t.kind,
      model: t.model,
      inputTokens: inTok,
      outputTokens: outTok,
      imageCalls: t.kind === 'image' && ok ? 1 : 0,
      costInr,
      costSource: source,
      ok,
      ms: Date.now() - t.startedAt,
      ...(error ? { error: error.slice(0, 160) } : {}),
    });
  }

  summary(estimatesInr: Record<string, number> = {}) {
    const byScenario: Record<
      string,
      {
        calls: number;
        failures: number;
        measuredInr: number;
        fallbackInr: number;
        totalInr: number;
        estimatedInr?: number;
        ms: number;
      }
    > = {};
    const byModel: Record<string, { calls: number; costInr: number }> = {};
    for (const e of this.ledger) {
      const s = (byScenario[e.scenario] ??= {
        calls: 0,
        failures: 0,
        measuredInr: 0,
        fallbackInr: 0,
        totalInr: 0,
        ms: 0,
      });
      s.calls++;
      if (!e.ok) s.failures++;
      if (e.costSource === 'measured') s.measuredInr += e.costInr;
      else s.fallbackInr += e.costInr;
      s.totalInr += e.costInr;
      s.ms += e.ms;
      const m = (byModel[e.model] ??= { calls: 0, costInr: 0 });
      m.calls++;
      m.costInr += e.costInr;
    }
    for (const [name, est] of Object.entries(estimatesInr)) {
      if (byScenario[name]) byScenario[name]!.estimatedInr = est;
    }
    const latencies = this.ledger.map((e) => e.ms).sort((a, b) => a - b);
    return {
      budgetInr: this.config.budgetInr,
      totalSpentInr: this.spent,
      totalCalls: this.ledger.length,
      failedCalls: this.ledger.filter((e) => !e.ok).length,
      fallbackCostCalls: this.ledger.filter((e) => e.costSource === 'fallback').length,
      p50CallMs: latencies[Math.floor(latencies.length / 2)] ?? 0,
      maxCallMs: latencies[latencies.length - 1] ?? 0,
      stoppedBecause: this.stopReason,
      byScenario,
      byModel,
    };
  }
}

export class CallTicket {
  private done = false;
  constructor(
    private readonly meter: UsageMeter,
    private readonly kind: CallKind,
    private readonly model: string,
    private readonly max: number,
    private readonly startedAt: number
  ) {}
  success(usage?: GeminiUsage): void {
    this.finish(true, usage);
  }
  failure(error: unknown): void {
    this.finish(false, undefined, error instanceof Error ? error.message : String(error));
  }
  private finish(ok: boolean, usage?: GeminiUsage, error?: string): void {
    if (this.done) return;
    this.done = true;
    this.meter.finish(
      { kind: this.kind, model: this.model, max: this.max, startedAt: this.startedAt },
      ok,
      usage,
      error
    );
  }
}

// ── Installation (module singleton; inactive unless a live harness installs one) ─────────────────────

let active: UsageMeter | null = null;
export function installUsageMeter(meter: UsageMeter | null): void {
  active = meter;
}
export function getUsageMeter(): UsageMeter | null {
  return active;
}

/** Begin a metered call, or return null when no meter is installed (production path: zero overhead). */
export function beginMeteredCall(kind: CallKind, model: string): CallTicket | null {
  return active ? active.begin(kind, model) : null;
}

/** Wrap one provider call. Passes straight through when no meter is installed. */
export async function meteredCall<T>(
  spec: { kind: CallKind; model: string },
  fn: () => Promise<T>,
  usageOf: (result: T) => GeminiUsage | undefined
): Promise<T> {
  const ticket = beginMeteredCall(spec.kind, spec.model);
  if (!ticket) return fn();
  try {
    const result = await fn();
    ticket.success(usageOf(result));
    return result;
  } catch (error) {
    ticket.failure(error);
    throw error;
  }
}

// ── Safety preconditions and the scenario runner ─────────────────────────────────────────────────────

/**
 * A live run must never touch production data: the Firebase emulators must be in use and the project must be a
 * demo- project, and a Gemini key must be present. Returns the list of violated conditions (empty = safe).
 */
export function liveRunEnvironmentProblems(env: NodeJS.ProcessEnv): string[] {
  const problems: string[] = [];
  if (!env['FIRESTORE_EMULATOR_HOST'])
    problems.push('FIRESTORE_EMULATOR_HOST is not set (would use real Firestore)');
  if (!env['FIREBASE_STORAGE_EMULATOR_HOST'] && !env['STORAGE_EMULATOR_HOST'])
    problems.push('the Storage emulator is not configured (would use real Storage)');
  const project = env['GCLOUD_PROJECT'] || env['FIREBASE_PROJECT_ID'] || '';
  if (!project.startsWith('demo-'))
    problems.push(`project "${project || '(none)'}" is not a demo- project`);
  if (!env['GEMINI_API_KEY']) problems.push('GEMINI_API_KEY is not set');
  if (env['NODE_ENV'] === 'production') problems.push('NODE_ENV is production');
  return problems;
}

export type ScenarioStatus = 'completed' | 'incomplete' | 'skipped' | 'failed';
export interface ScenarioOutcome {
  name: string;
  status: ScenarioStatus;
  reason?: string;
}

/**
 * Run scenarios in order under the meter. When the budget is reached (or the run is stopped) the scenario in flight
 * is reported `incomplete` and every remaining one `skipped`; nothing is silently dropped.
 */
export async function runScenariosUnderBudget(
  meter: UsageMeter,
  scenarios: Array<{ name: string; run: () => Promise<void> }>
): Promise<ScenarioOutcome[]> {
  const outcomes: ScenarioOutcome[] = [];
  let halted: string | null = null;
  for (const s of scenarios) {
    if (halted || meter.stopped) {
      outcomes.push({
        name: s.name,
        status: 'skipped',
        reason: halted ?? meter.stopped ?? 'run stopped',
      });
      continue;
    }
    try {
      await withMeterContext({ scenario: s.name }, s.run);
      // Providers wrap their errors, so a scenario can "finish" on fallbacks after the cap was hit. If the meter
      // stopped while it ran, its result is not trustworthy: report it incomplete.
      if (meter.stopped) {
        halted = meter.stopped;
        outcomes.push({ name: s.name, status: 'incomplete', reason: meter.stopped });
      } else {
        outcomes.push({ name: s.name, status: 'completed' });
      }
    } catch (error) {
      if (error instanceof BudgetExceededError || error instanceof RunStoppedError) {
        halted = error.message;
        outcomes.push({ name: s.name, status: 'incomplete', reason: error.message });
      } else {
        outcomes.push({
          name: s.name,
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        });
        if (meter.stopped) halted = meter.stopped;
      }
    }
  }
  return outcomes;
}
