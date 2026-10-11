import { HttpsError } from 'firebase-functions/v2/https';
import { UnsupportedVerticalError } from '../config/verticals';
import { redactSecrets } from './logging';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toHttpsError(): HttpsError {
    const codeMap: Record<string, HttpsError['code']> = {
      'validation-error': 'invalid-argument',
      'not-found': 'not-found',
      'permission-denied': 'permission-denied',
      unauthenticated: 'unauthenticated',
      'insufficient-credits': 'resource-exhausted',
      'rate-limit-exceeded': 'resource-exhausted',
      internal: 'internal',
    };
    return new HttpsError(codeMap[this.code] || 'internal', this.message, this.details);
  }
}

export class ValidationError extends AppError {
  constructor(
    public readonly fieldErrors: Record<string, string[]>,
    message = 'Validation failed'
  ) {
    super('validation-error', message, 400, { fieldErrors });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('not-found', `${resource} not found: ${id}`, 404, { resource, id });
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = 'Access denied') {
    super('permission-denied', message, 403);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super('unauthenticated', message, 401);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      'insufficient-credits',
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      400,
      { required, available }
    );
  }
}

export class RateLimitError extends AppError {
  constructor(action: string) {
    super('rate-limit-exceeded', `Rate limit exceeded for ${action}`, 429, { action });
  }
}

/**
 * Unexpected errors reach the browser as 'internal'. Some are deliberate, customer-readable
 * messages thrown as plain Errors ("Mitra couldn't find enough usable footage..."), but most are SDK,
 * credential, network or path text (e.g. "Cannot sign data without `client_email`") that must never
 * be shown to a customer. Technical-looking or very long messages are replaced; the full text stays in
 * the server log written by the caller before mapping.
 */
const TECHNICAL_MESSAGE =
  /client_email|credential|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket|firestore|firebase|googleapis|gcloud|projects\/|\bat .+\(|stack|TypeError|ReferenceError|SyntaxError|undefined|\bnull\b|\[object|GRPC|\bgax\b|Cannot (read|sign|set|find module)|is not a function|not found in storage|Renderer |REEL_RENDERER|PADDLE_|GEMINI|api[_ -]?key|secret|token/i;
export function customerSafeInternalMessage(message: string): string {
  if (/timed? ?out|timeout/i.test(message)) {
    return 'This is taking longer than expected. Please try again in a moment.';
  }
  if (!message || message.length > 240 || TECHNICAL_MESSAGE.test(message)) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }
  return message;
}

function buildHttpsError(error: unknown): HttpsError {
  // An HttpsError (e.g. checkRateLimit's 'resource-exhausted', or
  // verifyAuth's 'unauthenticated') already carries the correct callable
  // error code, message, and details. Without this check it fell through
  // to the generic `error instanceof Error` branch below — HttpsError
  // extends Error — which rebuilt it as a plain 'internal' error and threw
  // away the code and details (confirmed by a real emulator request: a
  // rejected checkRateLimit call surfaced to the client as 'internal'
  // instead of 'resource-exhausted', losing the retryAfterSeconds detail
  // and the client's ability to distinguish "rate limited" from "server
  // error").
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof AppError) {
    return error.toHttpsError();
  }
  // See UnsupportedVerticalError's own comment (config/verticals.ts) for why
  // it isn't an AppError subclass: that file must stay free of any
  // firebase-functions dependency.
  if (error instanceof UnsupportedVerticalError) {
    return new HttpsError('invalid-argument', error.message, { vertical: error.vertical });
  }
  // usageControl.ts's UsageControlError (plain Error + .code, not an
  // AppError subclass — that module deliberately has no firebase-functions
  // dependency). Without this, every credit/reservation error — including
  // DUPLICATE_REQUEST_IN_PROGRESS (M3, Pass 2) — collapsed to a generic
  // 'internal' error, indistinguishable from a real server failure, which
  // would make the frontend treat a "please retry in a moment" condition
  // the same as a hard failure requiring a fresh idempotency key.
  if (error instanceof Error && 'code' in error) {
    const usageCodeMap: Record<string, HttpsError['code']> = {
      INSUFFICIENT_CREDITS: 'resource-exhausted',
      DUPLICATE_REQUEST_IN_PROGRESS: 'already-exists',
      ALREADY_FINALIZED: 'already-exists',
      ALREADY_REFUNDED: 'failed-precondition',
      UNAUTHORIZED: 'permission-denied',
      // Truth Check discarded the campaign (nothing delivered, credits refunded).
      TRUTH_CHECK_FAILED: 'failed-precondition',
      OPERATION_NOT_FOUND: 'not-found',
      // P0-4: entitlements.ts's EntitlementError — same plain Error + .code
      // shape, same reasoning (no firebase-functions dependency in that
      // module either).
      FEATURE_NOT_AVAILABLE: 'permission-denied',
      PLAN_UPGRADE_REQUIRED: 'permission-denied',
      CAMPAIGN_QUOTA_EXCEEDED: 'resource-exhausted',
      BUSINESS_LIMIT_REACHED: 'resource-exhausted',
    };
    const mapped = usageCodeMap[(error as { code: string }).code];
    if (mapped) {
      return new HttpsError(mapped, error.message);
    }
  }
  if (error instanceof Error) {
    return new HttpsError('internal', customerSafeInternalMessage(error.message));
  }
  return new HttpsError('internal', 'An unexpected error occurred');
}

export function mapErrorToHttpsError(error: unknown): HttpsError {
  const httpsError = buildHttpsError(error);
  // Error Handling Audit: every branch above ultimately traces back to some
  // caller's `throw new Error(...)` somewhere in the call chain — including,
  // several layers down, a raw AI provider SDK exception (see
  // services/ai/text.ts/image.ts/vision.ts, which wrap-and-rethrow rather
  // than swallow). logging.ts's redactSecrets already strips API
  // keys/tokens/bearer headers before an error reaches Cloud Logging, but
  // that redaction was never applied to what gets sent back to the CLIENT —
  // this was the one place a raw provider error message (e.g. Gemini's
  // client embedding its own `?key=...` query param in a network-failure
  // message) could reach a real user's browser verbatim. Redacting the
  // final message here, once, covers every branch above by construction
  // rather than requiring every future error-construction site to remember
  // to do it individually. HttpsError's own `code`/`details` are untouched —
  // only `message` (free-form text) can ever contain this shape of leak.
  return new HttpsError(httpsError.code, redactSecrets(httpsError.message), httpsError.details);
}
