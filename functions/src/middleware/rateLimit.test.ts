/**
 * Rate-limit precision audit — this file did not exist before. The only
 * previous "coverage" of checkRateLimit() was a jest.mock() in
 * generateCampaignStrategy.vertical.test.ts that bypassed it entirely, so
 * nothing ever exercised the actual Firestore transaction, action->config
 * resolution, concurrency safety, or window-reset behavior. Real emulator
 * only (no mocks) — a mocked Firestore transaction can't prove the
 * check-then-write race is actually closed.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { checkRateLimit, rateLimitConfigs } from './rateLimit';

describeIfEmulator('checkRateLimit', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('allows requests under the limit and rejects the one that exceeds it', async () => {
    const userId = `user-${uuid()}`;
    const action = `test-action-${uuid()}`;
    const config = { maxRequests: 3, windowSeconds: 3600 };

    await checkRateLimit(userId, action, config);
    await checkRateLimit(userId, action, config);
    await checkRateLimit(userId, action, config); // exactly at limit — must still succeed

    await expect(checkRateLimit(userId, action, config)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('includes a retryAfterSeconds hint on rejection without leaking internal counters', async () => {
    const userId = `user-${uuid()}`;
    const action = `test-action-${uuid()}`;
    const config = { maxRequests: 1, windowSeconds: 3600 };

    await checkRateLimit(userId, action, config);
    try {
      await checkRateLimit(userId, action, config);
      throw new Error('expected rejection');
    } catch (err: any) {
      expect(err.code).toBe('resource-exhausted');
      expect(typeof err.details?.retryAfterSeconds).toBe('number');
      expect(err.details.retryAfterSeconds).toBeGreaterThan(0);
      expect(err.details.retryAfterSeconds).toBeLessThanOrEqual(config.windowSeconds);
      // Must not expose the raw Firestore document, key, or count.
      expect(JSON.stringify(err.details)).not.toMatch(/count|ratelimit_|resetTime/);
    }
  });

  it('isolates different users under the same action', async () => {
    const action = `test-action-${uuid()}`;
    const config = { maxRequests: 1, windowSeconds: 3600 };
    const userA = `user-${uuid()}`;
    const userB = `user-${uuid()}`;

    await checkRateLimit(userA, action, config);
    await expect(checkRateLimit(userA, action, config)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
    // A different user's quota must be untouched by user A's usage.
    await checkRateLimit(userB, action, config);
  });

  it('isolates different actions for the same user', async () => {
    const userId = `user-${uuid()}`;
    const config = { maxRequests: 1, windowSeconds: 3600 };
    const actionA = `test-action-${uuid()}`;
    const actionB = `test-action-${uuid()}`;

    await checkRateLimit(userId, actionA, config);
    await expect(checkRateLimit(userId, actionA, config)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
    // A different action bucket for the same user must be untouched.
    await checkRateLimit(userId, actionB, config);
  });

  it('resets after the window elapses', async () => {
    const userId = `user-${uuid()}`;
    const action = `test-action-${uuid()}`;
    const config = { maxRequests: 1, windowSeconds: 1 };

    await checkRateLimit(userId, action, config);
    await expect(checkRateLimit(userId, action, config)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });

    await new Promise((resolve) => setTimeout(resolve, 1100));

    await checkRateLimit(userId, action, config); // window reset — must succeed again
  });

  it('resolves policy from rateLimitConfigs by action name when no explicit config is passed — the exact bug this fix closes', async () => {
    // Regression test for the precision gap: every real call site invokes
    // checkRateLimit(userId, action) with only two arguments. Before this
    // fix, that silently used the generic 100-req/60s DEFAULT_CONFIG
    // regardless of the (unused) rateLimitConfigs map. This proves the
    // documented 10/hour campaign-generation policy is what's actually
    // enforced when no config argument is supplied at all.
    const action = 'generateCampaignStrategy';
    const configuredLimit = rateLimitConfigs[action]!.maxRequests;
    expect(configuredLimit).toBe(10);

    const userId = `user-${uuid()}`;
    for (let i = 0; i < configuredLimit; i++) {
      await checkRateLimit(userId, action); // no third argument
    }
    await expect(checkRateLimit(userId, action)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('falls back to the generic default for an action with no configured policy', async () => {
    const userId = `user-${uuid()}`;
    const action = `unconfigured-action-${uuid()}`;
    expect(rateLimitConfigs[action]).toBeUndefined();

    // DEFAULT_CONFIG allows 100/60s — too many to assert exhaustively here,
    // just prove a request succeeds and doesn't throw for an unmapped
    // action rather than crashing.
    await checkRateLimit(userId, action);
  });

  it('logs a warn-level event on rejection with safe fields, never internal counters (Phase — Monitoring & Observability)', async () => {
    const warnSpy = jest.spyOn(functions.logger, 'warn').mockImplementation(() => undefined);
    try {
      const userId = `user-${uuid()}`;
      const action = `test-action-${uuid()}`;
      const config = { maxRequests: 1, windowSeconds: 3600 };

      await checkRateLimit(userId, action, config);
      await expect(checkRateLimit(userId, action, config)).rejects.toMatchObject({
        code: 'resource-exhausted',
      });

      const rejectionCall = warnSpy.mock.calls.find(([msg]) => msg === 'rate_limit_rejected');
      expect(rejectionCall).toBeDefined();
      const [, payload] = rejectionCall!;
      expect(payload).toMatchObject({ userId, action });
      expect(typeof payload.retryAfterSeconds).toBe('number');
      expect(payload.count).toBeUndefined();
      expect(payload.resetTime).toBeUndefined();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it(
    'handles concurrent requests without a check-then-write race: exactly maxRequests succeed',
    async () => {
      const userId = `user-${uuid()}`;
      const action = `test-action-${uuid()}`;
      const config = { maxRequests: 10, windowSeconds: 3600 };

      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () => checkRateLimit(userId, action, config))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      expect(succeeded).toBe(config.maxRequests);
      expect(rejected).toBe(20 - config.maxRequests);

      // The stored count must reflect exactly the successful requests, not
      // more — a check-then-write race would allow the count to overshoot
      // maxRequests under concurrent load.
      const key = `ratelimit_${action}_${userId}`;
      const doc = await admin.firestore().collection('rate_limits').doc(key).get();
      expect(doc.data()?.['count']).toBe(config.maxRequests);
    },
    15_000
  );
});
