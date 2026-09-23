'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Root error boundary. No error.tsx/global-error.tsx existed before this
 * phase — an uncaught render error crashed to Next.js's default screen with
 * no capture and no application-appropriate message (Phase — Monitoring &
 * Observability, §32). Deliberately shows a generic message only: never a
 * stack trace or internal function name.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              We hit an unexpected error. Please refresh the page — if this keeps happening, contact{' '}
              <a href="mailto:support@brain-wise.com">support@brain-wise.com</a>.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
