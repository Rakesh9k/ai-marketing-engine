/**
 * Fault-injection test for checkRateLimit's failure mode — deliberately
 * makes the rate-limiter's Firestore backing store unreachable and proves
 * what actually happens, rather than inferring it from the absence of a
 * try/catch (see rateLimit.ts's own "no catch-and-continue path" comment,
 * and the Phase 38 audit report §18/F-6, which stopped short of this).
 *
 * FINDING (from directly observing this against a real unreachable host,
 * not assumed): the Firestore Admin SDK's gRPC transaction call does NOT
 * fail fast on a refused connection. Watched directly at 20s, then 90s,
 * then 182s of real wall-clock time against port 1 (nothing listens,
 * connection refused immediately at the OS level) — checkRateLimit's
 * promise never settled, neither resolving nor rejecting, in any of
 * those windows. There is no timeout wrapping the transaction in
 * rateLimit.ts, so its actual bound in production is whatever Cloud
 * Functions' own platform-level execution timeout is for the calling
 * function (documented default 60s for a v2 onCall with no explicit
 * `timeoutSeconds`, not independently re-verified against current GCP
 * docs in this session) — the platform kills the function, not the
 * application code detecting and reporting the failure.
 *
 * What this test CAN assert in a bounded, practical runtime: the promise
 * does not silently resolve (succeed) within a short window. That is the
 * property that actually matters for security — an outage must never
 * become a fast, silent "request allowed." It provably does not: below
 * we race checkRateLimit against a 5-second timer and confirm the timer
 * wins, i.e. no fast fail-open path exists. We do not additionally wait
 * out the full hang to observe an eventual rejection — that would make
 * this test impractically slow to run — but 182s of direct observation
 * (this file's history) is enough to be confident there isn't a delayed
 * fail-open path either.
 *
 * This does NOT run as part of the normal test suite. It requires
 * SIMULATE_FIRESTORE_OUTAGE=1 and a FIRESTORE_EMULATOR_HOST pointed at a
 * port nothing listens on, so it must be invoked in its own dedicated
 * `jest` process, separate from every other suite (which needs a working
 * emulator). Run with:
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:1 SIMULATE_FIRESTORE_OUTAGE=1 \
 *     GCLOUD_PROJECT=demo-mitra npx jest --ci \
 *     src/middleware/rateLimit.failSafe.test.ts
 */
const outageSimulated = process.env['SIMULATE_FIRESTORE_OUTAGE'] === '1';
const describeIfOutageSimulated = outageSimulated ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import { checkRateLimit } from './rateLimit';

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

describeIfOutageSimulated('checkRateLimit — Firestore backing store unavailable', () => {
  // No afterAll(() => admin.app().delete()) here, unlike every other test
  // file in this codebase: the checkRateLimit call raced against below is
  // deliberately left permanently in-flight against an unreachable host
  // (that's the whole point of this test), and deleting the app while
  // that transaction is still retrying can itself hang. jest.config.js's
  // `forceExit: true` already handles process cleanup for this file.

  it(
    'does not silently allow the request (resolve) within 5s when Firestore is unreachable',
    async () => {
      const userId = `user-${uuid()}`;
      const action = `test-action-${uuid()}`;

      const outcome = await Promise.race([
        checkRateLimit(userId, action, { maxRequests: 10, windowSeconds: 3600 }).then(
          () => 'resolved' as const
        ),
        delay(5000, 'still-pending' as const),
      ]);

      // The real question: does an infrastructure failure in the rate
      // limiter's own persistence layer ever resolve as if the request
      // were allowed, even eventually? If it had resolved within this
      // window, that would be a fail-open bug. It does not.
      expect(outcome).toBe('still-pending');
    },
    10_000
  );
});
