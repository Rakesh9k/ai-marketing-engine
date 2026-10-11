import * as Sentry from '@sentry/nextjs';
import { scrubSentryBreadcrumb, scrubSentryEvent, scrubSentryTransaction } from '@/lib/sentryScrub';

/**
 * Server + edge runtime Sentry init, following Next.js 15's instrumentation
 * hook convention (this replaces the older sentry.server.config.ts /
 * sentry.edge.config.ts split). See instrumentation-client.ts for the
 * browser-side init and the shared DSN/no-op rationale — `SENTRY_DSN` is
 * intentionally unset until a Sentry project is provisioned.
 */
export function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env['NODE_ENV'],
      release: process.env['NEXT_PUBLIC_SENTRY_RELEASE'],
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
      beforeSendTransaction: scrubSentryTransaction,
      beforeBreadcrumb: scrubSentryBreadcrumb,
    });
  }

  if (process.env['NEXT_RUNTIME'] === 'edge') {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env['NODE_ENV'],
      release: process.env['NEXT_PUBLIC_SENTRY_RELEASE'],
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
      beforeSendTransaction: scrubSentryTransaction,
      beforeBreadcrumb: scrubSentryBreadcrumb,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
