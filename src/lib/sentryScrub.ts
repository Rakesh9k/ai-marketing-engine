import type { Breadcrumb, ErrorEvent, Event, EventHint } from '@sentry/nextjs';

/**
 * Sentry scrubbing, shared by the browser, Node and edge inits. Everything runs in
 * `beforeSend` / `beforeSendTransaction` / `beforeBreadcrumb`, i.e. inside the SDK before
 * an envelope is built — nothing here depends on UI-level redaction.
 *
 * Mitra handles Firebase ID tokens, App Check tokens, Firebase email-action codes
 * (`oobCode` in /reset-password and /verify-email URLs), signed Storage URLs, OAuth codes,
 * Paddle keys, and customers' phone/e-mail/WhatsApp numbers. None of that may leave the
 * browser/server in an event. This mirrors functions/src/utils/logging.ts's redactSecrets().
 *
 * Deliberately KEPT for debugging: error types/messages (with secrets masked), stack traces,
 * HTTP method, URL path, status codes, route/transaction names, Firebase uid, Paddle
 * subscription/transaction ids, plan ids, campaign/business ids, error codes, and token
 * *counts* (`inputTokens`, `outputTokens`, ...).
 *
 * Fail closed: if scrubbing itself throws, the event is dropped (returns null) rather than
 * sent unscrubbed.
 */

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 10;

/** Query/fragment parameter names whose values are secrets, codes or personal data. */
const SENSITIVE_PARAM =
  '(?:[\\w-]*(?:token|secret|password|passwd|signature|credential|oobcode|apikey|api[-_]key|session)[\\w-]*|key|sig|code|state|auth|sid|otp|email|phone|mobile)';

const SECRET_PATTERNS: Array<[RegExp, string | ((...m: string[]) => string)]> = [
  // ?token=… &key=… #access_token=… (also inside free text / breadcrumb URLs)
  [new RegExp(`([?&#;])(${SENSITIVE_PARAM})=([^&#\\s"'<>]*)`, 'gi'), `$1$2=${REDACTED}`],
  // Authorization headers and bare bearer/basic credentials
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, `$1 ${REDACTED}`],
  // JWTs: Firebase ID tokens, App Check tokens, custom tokens
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, REDACTED],
  // Provider keys
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, REDACTED], // OpenAI-style
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, REDACTED], // Google / Firebase web & Gemini keys
  [/\brzp_(?:live|test)_[A-Za-z0-9]{10,}\b/g, REDACTED], // Razorpay (legacy)
  [/\bpdl_[A-Za-z0-9_]{16,}\b/g, REDACTED], // Paddle API keys + notification secrets
  [/\b(?:live|test)_[a-f0-9]{20,}\b/g, REDACTED], // Paddle client-side tokens
  [/\bGOCSPX-[A-Za-z0-9_-]{16,}\b/g, REDACTED], // Google OAuth client secret
  [/\bEAA[A-Za-z0-9]{20,}\b/g, REDACTED], // Meta access tokens
  // Paddle personal-data ids (customer / address / business). Subscription (sub_) and
  // transaction (txn_) ids are kept: they identify a payment, not a person, and support
  // needs them.
  [/\b(ctm|add|biz)_[0-9a-z]{20,}\b/g, `$1_${REDACTED}`],
  // Personal data
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, '[EMAIL]'],
  [/(?<![\w.])\+\d{1,3}[\s-]?(?:\d[\s-]?){8,12}\d(?![\w])/g, '[PHONE]'], // +91 98765 43210
  [/(?<![\w.+])[6-9]\d{9}(?![\w])/g, '[PHONE]'], // bare Indian mobile
];

/** Property names whose VALUE is always replaced, whatever it contains. */
const SENSITIVE_KEY =
  /authorization|cookie|token|secret|password|passwd|signature|credential|api[-_]?key|private[-_]?key|session|oobcode|^(?:x-goog-.*|sig|otp|pin|sid)$|e-?mail|phone|mobile|whatsapp|address|^(?:ip|username|displayName|display_name)$/i;

/** Token *counts* are useful diagnostics, not credentials. */
const SAFE_KEY =
  /^(?:(?:input|output|total|max|prompt|completion|cached)[-_ ]?tokens?|tokens?[-_ ]?(?:used|count|limit|remaining|per[-_ ]?\w+))$/i;

function isSensitiveKey(key: string): boolean {
  return !SAFE_KEY.test(key) && SENSITIVE_KEY.test(key);
}

/** Masks secrets and personal data inside a string (URLs, messages, free text). */
export function scrubString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    out = out.replace(pattern, replacement as string);
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep copy with secrets masked. Handles cycles (replaced by "[Circular]"), arbitrary nesting
 * (truncated past MAX_DEPTH) and leaves non-plain objects (Date, Error, class instances) alone
 * apart from masking Error messages.
 */
export function scrubValue<T>(value: T, depth = 0, seen: WeakSet<object> = new WeakSet()): T {
  if (typeof value === 'string') return scrubString(value) as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[Truncated]' as unknown as T;
  if (seen.has(value as object)) return '[Circular]' as unknown as T;
  seen.add(value as object);

  let result: unknown;
  if (Array.isArray(value)) {
    result = value.map((item) => scrubValue(item, depth + 1, seen));
  } else if (value instanceof Error) {
    const copy = new Error(scrubString(value.message));
    copy.name = value.name;
    if (value.stack) copy.stack = scrubString(value.stack);
    result = copy;
  } else if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSensitiveKey(k) && v != null ? REDACTED : scrubValue(v, depth + 1, seen);
    }
    result = out;
  } else {
    result = value;
  }
  seen.delete(value as object);
  return result as T;
}

function scrubRequest(request: NonNullable<Event['request']>): void {
  // A Firebase ID token or session cookie has no legitimate reason to appear in an error report.
  delete request.cookies;
  delete request.headers;
  if (request.url) request.url = scrubString(request.url);
  if (request.query_string !== undefined) {
    request.query_string =
      typeof request.query_string === 'string'
        ? scrubString(`?${request.query_string.replace(/^\?/, '')}`).slice(1)
        : scrubValue(request.query_string);
  }
  if (request.data !== undefined) request.data = scrubValue(request.data);
  if (request.env) request.env = scrubValue(request.env);
}

function scrubUser(event: Event): void {
  if (!event.user) return;
  // Keep only the (pseudonymous) Firebase uid so a report can be tied to a session.
  const id = event.user['id'];
  event.user = id === undefined ? {} : { id };
}

/** Scrubs everything common to error and transaction events, in place. */
function scrubCommon<T extends Event>(event: T): T {
  if (event.request) scrubRequest(event.request);
  scrubUser(event);

  if (event.message) event.message = scrubString(event.message);
  if (event.logentry) {
    event.logentry = {
      ...event.logentry,
      message: event.logentry.message
        ? scrubString(event.logentry.message)
        : event.logentry.message,
      params: event.logentry.params ? scrubValue(event.logentry.params) : event.logentry.params,
    };
  }
  if (event.transaction) event.transaction = scrubString(event.transaction);

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value ? scrubString(exception.value) : exception.value,
      stacktrace: exception.stacktrace
        ? {
            ...exception.stacktrace,
            frames: exception.stacktrace.frames?.map((frame) => ({
              ...frame,
              ...(frame.vars ? { vars: scrubValue(frame.vars) } : {}),
              ...(frame.filename ? { filename: scrubString(frame.filename) } : {}),
              ...(frame.abs_path ? { abs_path: scrubString(frame.abs_path) } : {}),
            })),
          }
        : exception.stacktrace,
    }));
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumbValue);
  }
  if (event.extra) event.extra = scrubValue(event.extra);
  if (event.contexts) event.contexts = scrubValue(event.contexts);
  if (event.tags) event.tags = scrubValue(event.tags);
  if (event.spans) {
    event.spans = event.spans.map((span) => ({
      ...span,
      ...(span.description ? { description: scrubString(span.description) } : {}),
      ...(span.data ? { data: scrubValue(span.data) } : {}),
    }));
  }
  return event;
}

function scrubBreadcrumbValue(crumb: Breadcrumb): Breadcrumb {
  return {
    ...crumb,
    ...(crumb.message ? { message: scrubString(crumb.message) } : {}),
    ...(crumb.data ? { data: scrubValue(crumb.data) } : {}),
  };
}

/** `beforeSend` for errors. Drops the event if scrubbing fails. */
export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  try {
    return scrubCommon(event);
  } catch {
    return null;
  }
}

/** `beforeSendTransaction` — performance events carry URLs, span descriptions and data too. */
export function scrubSentryTransaction<T extends Event>(event: T): T | null {
  try {
    return scrubCommon(event);
  } catch {
    return null;
  }
}

/** `beforeBreadcrumb` — scrubs at capture time, so nothing sensitive sits in the buffer. */
export function scrubSentryBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  try {
    return scrubBreadcrumbValue(crumb);
  } catch {
    return null;
  }
}
