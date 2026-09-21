/**
 * Bounded retry + timeout helpers for AI provider calls.
 *
 * No retry/timeout mechanism existed anywhere in the codebase before this
 * (confirmed by repo-wide search) — provider calls in text.ts/vision.ts/
 * image.ts could hang indefinitely and any transient failure (a single rate
 * limit blip) would fail the whole campaign generation with no retry at all.
 * This is a small, single-purpose utility, not a parallel AI system — it
 * wraps calls made through the existing aiServices abstraction in index.ts
 * and nothing else.
 */

export class AITimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'AITimeoutError';
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AITimeoutError(label, ms)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Decides whether a failure is worth retrying.
 *
 * Retryable: transient network/availability/rate-limit/timeout errors — the
 * same request is likely to succeed on a second attempt.
 *
 * NOT retryable: authentication/API-key/permission errors (deterministic
 * configuration problems) and schema validation failures (a malformed
 * prompt or schema mismatch is a programming bug — retrying sends the exact
 * same broken request again and only multiplies AI provider cost without
 * any chance of success).
 *
 * Unknown/unclassified errors default to NOT retryable, since silently
 * retrying an error we don't understand risks uncontrolled cost
 * multiplication (see Phase 5 cost-control requirement) more than it risks
 * missing a recoverable case.
 */
export function isRetryableAIError(error: unknown): boolean {
  if (error instanceof AITimeoutError) return true;

  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

  const nonRetryablePatterns = [
    'api key',
    'apikey',
    'unauthorized',
    'authentication',
    'permission',
    'forbidden',
    'schema validation failed',
    'invalid argument',
  ];
  if (nonRetryablePatterns.some((p) => message.includes(p))) return false;

  const retryablePatterns = [
    'rate limit',
    '429',
    '500',
    '502',
    '503',
    '504',
    'timed out',
    'timeout',
    'econnreset',
    'etimedout',
    'econnrefused',
    'unavailable',
    'network',
    'fetch failed',
  ];
  if (retryablePatterns.some((p) => message.includes(p))) return true;

  return false;
}

export interface RetryOptions {
  /** Total attempts including the first call. Default 3. */
  maxAttempts?: number;
  /** Base delay for exponential backoff, in ms. Default 500. */
  baseDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;

/**
 * Bounded retry — never retries more than maxAttempts total, and never
 * retries a non-retryable error. Always eventually throws (never resolves
 * with a swallowed failure), so callers' credit-refund logic still fires.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const isRetryable = options.isRetryable ?? isRetryableAIError;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }
      options.onRetry?.(attempt, error);
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // Unreachable (the loop above always returns or throws), but keeps TS happy.
  throw lastError;
}
