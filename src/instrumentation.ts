import * as Sentry from '@sentry/nextjs';

/**
 * Server + edge runtime Sentry init, following Next.js 15's instrumentation
 * hook convention (this replaces the older sentry.server.config.ts /
 * sentry.edge.config.ts split). See instrumentation-client.ts for the
 * browser-side init and the shared DSN/no-op rationale — `SENTRY_DSN` is
 * intentionally unset until a Sentry project is provisioned.
 */
export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { scrubSentryEvent } = await import('@/lib/sentryScrub');
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env['NODE_ENV'],
      release: process.env['NEXT_PUBLIC_SENTRY_RELEASE'],
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
    });
  }

  if (process.env['NEXT_RUNTIME'] === 'edge') {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['NEXT_PUBLIC_VERCEL_ENV'] ?? process.env['NODE_ENV'],
      release: process.env['NEXT_PUBLIC_SENTRY_RELEASE'],
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
