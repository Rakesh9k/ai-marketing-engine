import type { ErrorEvent, EventHint } from '@sentry/nextjs';

/**
 * Shared beforeSend for both the client and server Sentry init. Mitra
 * exchanges Firebase ID tokens, App Check tokens, signed Storage URLs and a
 * Razorpay key — none of these may leave the browser/server as a Sentry
 * event (Phase — Monitoring & Observability, §6/§18/§30). This is a
 * defensive net on top of not intentionally capturing that data, mirroring
 * the redaction approach already used server-side in
 * functions/src/utils/logging.ts's redactSecrets().
 */
const SECRET_PATTERNS: RegExp[] = [
  /([?&](?:key|api_key|apikey|token|access_token|signature)=)[^&\s"']+/gi,
  /(Authorization:\s*Bearer\s+)\S+/gi,
  /\bsk-[A-Za-z0-9]{16,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\brzp_(live|test)_[A-Za-z0-9]{10,}\b/g,
];

function redact(value: string): string {
  return SECRET_PATTERNS.reduce(
    (text, pattern) =>
      text.replace(pattern, (match, prefix) => (prefix ? `${prefix}[REDACTED]` : '[REDACTED]')),
    value
  );
}

function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redact(value) as unknown as T;
  if (Array.isArray(value)) return value.map(redactDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/authorization|cookie|token|secret|password|signature/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function scrubSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  // Never send cookies or request headers — a Firebase ID token or session
  // cookie has no legitimate reason to appear in an error report.
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    if (event.request.data) {
      event.request.data = redactDeep(event.request.data);
    }
  }
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value ? redact(exception.value) : exception.value,
    }));
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? redact(crumb.message) : crumb.message,
      data: crumb.data ? redactDeep(crumb.data) : crumb.data,
    }));
  }
  if (event.extra) {
    event.extra = redactDeep(event.extra);
  }
  return event;
}
