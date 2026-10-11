/**
 * Credit-safety tests for the existing reservation/finalization/refund state
 * machine, run against the real Firestore emulator (not a hand-rolled mock)
 * so the actual transaction logic in usageControl.ts is exercised. Mirrors
 * the project's existing skip-if-no-emulator convention (see
 * tests/security.test.ts) — self-skips rather than failing when
 * FIRESTORE_EMULATOR_HOST is not set, and never claims to have run if it
 * didn't.
 */
import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import * as usageControl from './usageControl';
import { PRICING } from '../config/pricing';

const CAMPAIGN_COST = usageControl.getGenerationCost('campaign_generation');
const FREE_ALLOWANCE = PRICING.subscriptionTiers.free.monthlyCredits;

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

describeIfEmulator('usageControl credit safety (Firestore emulator)', () => {
  const db = admin.firestore();
  const testUserId = () => `test-user-${uuid()}`;

  async function seedActiveUsage(userId: string, planId: 'free' | 'business' = 'business') {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await db
      .collection('usage')
      .doc(usageId)
      .set({
        usageId,
        userId,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        planId,
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: new Date().toISOString(),
      });
    return usageId;
  }

  afterAll(async () => {
    await admin.app().delete();
  });

  it('CASE 1: reservation + finalize on success — transaction ends completed, no refund exists', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    const reservation = await usageControl.reserveCreditsForOperation(
      userId,
      operationId,
      'campaign_generation',
      CAMPAIGN_COST
    );
    expect(reservation.creditsReserved).toBe(CAMPAIGN_COST);

    const finalize = await usageControl.finalizeReservation(operationId);
    expect(finalize.success).toBe(true);

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('completed');

    const refundSnap = await db.collection('transactions').doc(`refund_${operationId}`).get();
    expect(refundSnap.exists).toBe(false);
  });

  it('CASE 2/5: provider/pipeline failure inside executeWithUsageControl -> refunded, error is not swallowed', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    await expect(
      usageControl.executeWithUsageControl(userId, operationId, 'campaign_generation', async () => {
        throw new Error('simulated provider failure');
      })
    ).rejects.toThrow('simulated provider failure');

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('refunded');
  });

  it('CASE 4: timeout-shaped failure -> refunded (any thrown error composes correctly, not just specific error types)', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    class FakeTimeoutError extends Error {}
    await expect(
      usageControl.executeWithUsageControl(userId, operationId, 'campaign_generation', async () => {
        throw new FakeTimeoutError('timed out after 30000ms');
      })
    ).rejects.toThrow('timed out');

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('refunded');
  });

  it('CASE 6: successful generation -> credits finalized, never left pending, never double-charged', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.executeWithUsageControl(
      userId,
      operationId,
      'campaign_generation',
      async () => 'ok'
    );

    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST);

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('completed');
  });

  it('CASE 8: duplicate request with the same operationId does not reserve credits twice (idempotency)', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', CAMPAIGN_COST);
    const second = await usageControl.reserveCreditsForOperation(
      userId,
      operationId,
      'campaign_generation',
      CAMPAIGN_COST
    );
    expect(second.transactionId).toBe(operationId);

    const usageSnap = await db.collection('usage').doc(usageId).get();
    // Only one increment of CAMPAIGN_COST happened, not two.
    expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST);
  });

  it('CASE 9: already-finalized reservation cannot be finalized again, and cannot be refunded', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', CAMPAIGN_COST);
    await usageControl.finalizeReservation(operationId);

    // Finalizing again is idempotent (no error, no double effect).
    const secondFinalize = await usageControl.finalizeReservation(operationId);
    expect(secondFinalize.success).toBe(true);

    // But refunding a finalized reservation must be rejected, not silently allowed.
    await expect(usageControl.refundReservation(operationId, userId)).rejects.toThrow(/finalized/i);
  });

  it('CASE 9b: an already-refunded reservation cannot be finalized, and re-refunding is idempotent (no double refund)', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', CAMPAIGN_COST);
    await usageControl.refundReservation(operationId, userId);

    await expect(usageControl.finalizeReservation(operationId)).rejects.toThrow(/refunded/i);

    // Refunding again must not refund a second time.
    const secondRefund = await usageControl.refundReservation(operationId, userId);
    expect(secondRefund.success).toBe(true);

    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(0); // reserved CAMPAIGN_COST, refunded CAMPAIGN_COST, never double-refunded below 0
  });

  it('no reservation -> finalize/refund fail with OPERATION_NOT_FOUND rather than fabricating success', async () => {
    const userId = testUserId();
    await expect(usageControl.finalizeReservation('never-reserved-op')).rejects.toMatchObject({
      code: 'OPERATION_NOT_FOUND',
    });
    await expect(usageControl.refundReservation('never-reserved-op', userId)).rejects.toMatchObject(
      {
        code: 'OPERATION_NOT_FOUND',
      }
    );
  });

  it('reordering fix: a user with an active subscription but NO usage doc for the period can still reserve credits', async () => {
    // Regression test for the reordering fix in reserveCreditsForOperation:
    // previously checkGenerationEligibility ran before the usage doc was
    // ensured to exist, so this would incorrectly throw INSUFFICIENT_CREDITS
    // for every user's first generation of a new billing period.
    const userId = testUserId();
    // Deliberately do NOT seed a usage doc.
    const operationId = uuid();

    const reservation = await usageControl.reserveCreditsForOperation(
      userId,
      operationId,
      'campaign_generation',
      50
    );
    expect(reservation.creditsReserved).toBe(50);
  });

  it('insufficient credits genuinely blocks reservation (credit gate is not bypassed)', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId, 'free'); // free monthly credits (free)
    const operationId = uuid();

    await expect(
      usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 141)
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.exists).toBe(false); // nothing reserved
  });

  // Phase 8 Credits & Usage Enforcement Audit — the explicit boundary and
  // zero-balance cases the audit asks for, distinct from the general
  // "insufficient" case above.
  it('ZERO BALANCE: a user who has already used their entire monthly allowance cannot reserve any further credits', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId, 'free'); // free monthly credits (free)
    await db.collection('usage').doc(usageId).update({ creditsUsed: FREE_ALLOWANCE });
    const operationId = uuid();

    await expect(
      usageControl.reserveCreditsForOperation(userId, operationId, 'regeneration', 10)
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });

    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(FREE_ALLOWANCE); // unchanged, not pushed negative-available
  });

  it('EXACT CREDITS: a request for precisely the remaining balance succeeds (off-by-one boundary is not rejected)', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId, 'business'); // 1200 monthly credits
    await db.collection('usage').doc(usageId).update({ creditsUsed: 1190 }); // exactly 10 left
    const operationId = uuid();

    const reservation = await usageControl.reserveCreditsForOperation(
      userId,
      operationId,
      'regeneration',
      10
    );
    expect(reservation.creditsReserved).toBe(10);
    expect(reservation.creditsRemaining).toBe(0);

    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(1200);

    // With the balance now at exactly 0, a further request of any size must fail.
    await expect(
      usageControl.reserveCreditsForOperation(userId, uuid(), 'regeneration', 10)
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });
  });

  // Phase 8: distinct from the M3 "same operationId" duplicate-request tests
  // below — this proves the credit gate itself correctly serializes two
  // genuinely DIFFERENT operations (different idempotencyKeys, e.g. two
  // separate browser tabs, or a double-click that generates two different
  // client-side UUIDs) racing for the SAME finite balance, rather than both
  // reading a stale "credits available" snapshot and both succeeding.
  it('CONCURRENCY: two different operations racing for the same limited balance cannot both succeed if their combined cost exceeds it', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId, 'free'); // free monthly credits (free)
    const operationIdA = uuid();
    const operationIdB = uuid();

    // Each individually fits (100 <= CAMPAIGN_COST), but together they do not (200 > CAMPAIGN_COST).
    const results = await Promise.allSettled([
      usageControl.reserveCreditsForOperation(userId, operationIdA, 'campaign_generation', 100),
      usageControl.reserveCreditsForOperation(userId, operationIdB, 'campaign_generation', 100),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
    });

    // Exactly one reservation actually landed — never both (200) and never
    // neither (0).
    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(100);
  });

  // M3 (Pass 2) — a retry/duplicate call for the SAME operationId must never
  // run the (billable) generation function a second time.
  describe('M3: duplicate/retry does not re-run generation', () => {
    it('a second executeWithUsageControl call for the SAME operationId while the first is still pending does NOT call generationFn again', async () => {
      const userId = testUserId();
      const usageId = await seedActiveUsage(userId);
      const operationId = uuid();

      // Simulate the first call's reservation already existing (as if it
      // were still mid-generation) by reserving directly, without finalizing.
      await usageControl.reserveCreditsForOperation(
        userId,
        operationId,
        'campaign_generation',
        CAMPAIGN_COST
      );

      const generationFn = jest.fn().mockResolvedValue('should never run');
      await expect(
        usageControl.executeWithUsageControl(
          userId,
          operationId,
          'campaign_generation',
          generationFn
        )
      ).rejects.toMatchObject({ code: 'DUPLICATE_REQUEST_IN_PROGRESS' });

      expect(generationFn).not.toHaveBeenCalled();

      // Critically: the ORIGINAL (still in-flight) reservation must NOT have
      // been refunded by this losing duplicate call — only CAMPAIGN_COST credits used,
      // still pending, not decremented back to 0.
      const usageSnap = await db.collection('usage').doc(usageId).get();
      expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST);
      const txSnap = await db.collection('transactions').doc(operationId).get();
      expect(txSnap.data()!['status']).toBe('pending');
    });

    it('the ORIGINAL request can still finalize normally after a duplicate lost the race', async () => {
      const userId = testUserId();
      const usageId = await seedActiveUsage(userId);
      const operationId = uuid();

      await usageControl.reserveCreditsForOperation(
        userId,
        operationId,
        'campaign_generation',
        CAMPAIGN_COST
      );

      // Duplicate call — loses, does not disturb the original reservation.
      await expect(
        usageControl.executeWithUsageControl(userId, operationId, 'campaign_generation', jest.fn())
      ).rejects.toMatchObject({ code: 'DUPLICATE_REQUEST_IN_PROGRESS' });

      // The original request now finishes generation and finalizes.
      await usageControl.finalizeReservation(operationId);

      const txSnap = await db.collection('transactions').doc(operationId).get();
      expect(txSnap.data()!['status']).toBe('completed');
      const usageSnap = await db.collection('usage').doc(usageId).get();
      expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST); // charged exactly once
    });

    it('concurrent executeWithUsageControl calls for the SAME operationId: generationFn runs exactly once, credits charged exactly once', async () => {
      const userId = testUserId();
      const usageId = await seedActiveUsage(userId);
      const operationId = uuid();

      const generationFn = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('ok'), 50)));

      const results = await Promise.allSettled([
        usageControl.executeWithUsageControl(
          userId,
          operationId,
          'campaign_generation',
          generationFn
        ),
        usageControl.executeWithUsageControl(
          userId,
          operationId,
          'campaign_generation',
          generationFn
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      // Exactly one side wins and actually runs the generation. The loser's
      // exact error code depends on timing — DUPLICATE_REQUEST_IN_PROGRESS
      // if it reserves while the winner is still mid-generation,
      // ALREADY_FINALIZED if the winner has already completed by the time
      // the loser's own reservation transaction runs — but either way it
      // must never be a second execution of generationFn.
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        code: expect.stringMatching(/^(DUPLICATE_REQUEST_IN_PROGRESS|ALREADY_FINALIZED)$/),
      });
      expect(generationFn).toHaveBeenCalledTimes(1);

      const usageSnap = await db.collection('usage').doc(usageId).get();
      expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST); // charged exactly once, not 280
    });
  });

  // Phase 9 AI Failure -> Credit Refund Audit. executeWithUsageControl is
  // the ONE shared mechanism generateCampaignStrategy.ts, regenerateAsset.ts,
  // generateReel.ts, and analyzeReferenceStyle.ts all funnel their AI call
  // through — JS/TS async error propagation means ANY thrown error, of ANY
  // shape, reaches the exact same catch block here (there is no code path
  // that could special-case one shape and accidentally swallow it). These
  // tests exist to prove that guarantee against each shape the audit names
  // explicitly, deterministically, with no real AI provider involved.
  describe('Phase 9: refund behavior is identical regardless of failure shape', () => {
    function shapeCases(): Array<[string, () => never]> {
      class FakeTimeoutError extends Error {}
      class HttpError extends Error {
        constructor(
          public status: number,
          message: string
        ) {
          super(message);
        }
      }
      return [
        [
          'Gemini/provider timeout',
          () => {
            throw new FakeTimeoutError('deadline exceeded after 30000ms');
          },
        ],
        [
          'HTTP 4xx from provider (bad request / rate limited)',
          () => {
            throw new HttpError(429, 'Resource exhausted');
          },
        ],
        [
          'HTTP 5xx from provider (upstream outage)',
          () => {
            throw new HttpError(503, 'Service unavailable');
          },
        ],
        [
          'generic provider SDK exception',
          () => {
            throw new Error('GoogleGenerativeAIError: request failed');
          },
        ],
        [
          'malformed/unparseable provider response',
          () => {
            throw new SyntaxError('Unexpected token < in JSON at position 0');
          },
        ],
      ];
    }

    it.each(shapeCases())(
      '%s -> credits refunded, transaction marked refunded, not left pending',
      async (_label, throwError) => {
        const userId = testUserId();
        const usageId = await seedActiveUsage(userId);
        const operationId = uuid();

        await expect(
          usageControl.executeWithUsageControl(
            userId,
            operationId,
            'campaign_generation',
            async () => {
              throwError();
            }
          )
        ).rejects.toThrow();

        const txSnap = await db.collection('transactions').doc(operationId).get();
        expect(txSnap.data()!['status']).toBe('refunded');
        const usageSnap = await db.collection('usage').doc(usageId).get();
        expect(usageSnap.data()!['creditsUsed']).toBe(0); // fully refunded, not left partially charged
      }
    );

    it('DATABASE FAILURE AFTER AI SUCCESS: a write that fails AFTER the AI call already resolved still triggers a full refund', async () => {
      // Simulates the real risk this scenario describes: the AI provider
      // call succeeds (a real cost has already been incurred), but a
      // subsequent Firestore write inside the same generation callback
      // throws. Since executeWithUsageControl wraps the ENTIRE callback,
      // not just the AI call, this must refund exactly the same as any
      // other mid-generation failure — the user got no usable result, so
      // they must not be left permanently charged, even though Mitra's own
      // AI provider cost was real and non-refundable to Mitra itself. That
      // asymmetry (documented here, not hidden) is the intended trade-off:
      // never let a backend-side failure become the customer's financial
      // loss.
      const userId = testUserId();
      const usageId = await seedActiveUsage(userId);
      const operationId = uuid();
      const aiCallSucceeded = jest.fn();

      await expect(
        usageControl.executeWithUsageControl(
          userId,
          operationId,
          'campaign_generation',
          async () => {
            const aiResult = { imageUrl: 'https://example.test/generated.png' }; // AI call "succeeded"
            aiCallSucceeded(aiResult);
            throw new Error('Firestore: DEADLINE_EXCEEDED writing campaign_assets doc');
          }
        )
      ).rejects.toThrow('DEADLINE_EXCEEDED');

      expect(aiCallSucceeded).toHaveBeenCalledTimes(1); // the AI call really did run/succeed
      const txSnap = await db.collection('transactions').doc(operationId).get();
      expect(txSnap.data()!['status']).toBe('refunded'); // but the user is still made whole
      const usageSnap = await db.collection('usage').doc(usageId).get();
      expect(usageSnap.data()!['creditsUsed']).toBe(0);
    });

    it('DUPLICATE RETRY after a failure: retrying the SAME idempotencyKey after a refund starts a fresh, independent attempt (not blocked, not double-refunded)', async () => {
      // Distinct from the M3 "duplicate while still pending" tests above —
      // this is the retry-AFTER-terminal-failure case: a client that
      // legitimately retries (e.g. user clicks "Generate" again after
      // seeing an error) with a NEW idempotencyKey must be able to, and
      // must be charged exactly once for that new attempt regardless of
      // the prior failed-and-refunded one.
      const userId = testUserId();
      const usageId = await seedActiveUsage(userId);
      const firstAttempt = uuid();

      await expect(
        usageControl.executeWithUsageControl(
          userId,
          firstAttempt,
          'campaign_generation',
          async () => {
            throw new Error('transient failure');
          }
        )
      ).rejects.toThrow('transient failure');

      let usageSnap = await db.collection('usage').doc(usageId).get();
      expect(usageSnap.data()!['creditsUsed']).toBe(0); // fully refunded after attempt 1

      const secondAttempt = uuid();
      const result = await usageControl.executeWithUsageControl(
        userId,
        secondAttempt,
        'campaign_generation',
        async () => 'ok'
      );
      expect(result.result).toBe('ok');

      usageSnap = await db.collection('usage').doc(usageId).get();
      expect(usageSnap.data()!['creditsUsed']).toBe(CAMPAIGN_COST); // charged exactly once for the successful retry
    });
  });
});
