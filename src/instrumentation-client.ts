import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from '@/lib/sentryScrub';

/**
 * Client-side Sentry init. `NEXT_PUBLIC_SENTRY_DSN` is intentionally unset in
 * this environment (no Sentry account/project has been provisioned yet — see
 * docs/OBSERVABILITY_AUDIT_REPORT.md). Sentry.init() with an empty DSN is a
 * documented no-op: the SDK loads and runs but sends nothing, so this file
 * is safe to ship ahead of that provisioning step without generating noise
 * or failing the build.
 */
Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env['NODE_ENV'],
  release: process.env['NEXT_PUBLIC_SENTRY_RELEASE'],
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
