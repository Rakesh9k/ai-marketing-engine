/**
 * Phase 10 — verifyPayment (the client-callback verification entry point)
 * tests, run against the real Firestore emulator. Mocks the Razorpay SDK
 * client only (no real Razorpay network access in this environment) —
 * everything else (auth, ownership checks, Firestore reads/writes) is the
 * real implementation.
 */
import * as crypto from 'crypto';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const paymentsFetchMock = jest.fn();
jest.mock('../../services/razorpay', () => ({
  getRazorpayClient: () => ({ payments: { fetch: paymentsFetchMock } }),
}));

import * as admin from 'firebase-admin';
import { verifyPayment } from './verifyPayment';
import { createSubscriptionDoc, getSubscriptionDoc } from '../../services/firestore';
import type { Subscription } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return {
    data,
    auth: { uid, token: {} as any },
  } as any;
}

describeIfEmulator('verifyPayment (Firestore emulator, Phase 10)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedSubscription(userId: string, razorpaySubscriptionId: string): Promise<Subscription> {
    const sub: Subscription = {
      subscriptionId: razorpaySubscriptionId,
      userId,
      planId: 'business',
      status: 'incomplete',
      razorpaySubscriptionId,
      razorpayCustomerId: 'cust_test',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      creditsIncluded: 0,
      creditsUsed: 0,
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createSubscriptionDoc(sub);
    return sub;
  }

  beforeEach(() => jest.clearAllMocks());

  it('marks the subscription active only when Razorpay reports the payment as captured (authoritative server-side confirmation, not client-asserted success)', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const razorpaySubscriptionId = `sub_${crypto.randomUUID()}`;
    await seedSubscription(userId, razorpaySubscriptionId);

    paymentsFetchMock.mockResolvedValue({ status: 'captured', created_at: Math.floor(Date.now() / 1000) });

    const result = await (verifyPayment as any).run(
      callableRequest(
        {
          razorpaySubscriptionId,
          razorpayPaymentId: `pay_${crypto.randomUUID()}`,
          razorpaySignature: 'irrelevant-but-required-by-schema',
        },
        userId
      )
    );

    expect(result.status).toBe('active');
    const sub = await getSubscriptionDoc(razorpaySubscriptionId);
    expect(sub!.status).toBe('active');
  });

  it('rejects when Razorpay reports the payment as NOT captured — client-side "payment_success" cannot fabricate this', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const razorpaySubscriptionId = `sub_${crypto.randomUUID()}`;
    await seedSubscription(userId, razorpaySubscriptionId);

    paymentsFetchMock.mockResolvedValue({ status: 'failed' });

    await expect(
      (verifyPayment as any).run(
        callableRequest(
          { razorpaySubscriptionId, razorpayPaymentId: `pay_${crypto.randomUUID()}`, razorpaySignature: 'x' },
          userId
        )
      )
    ).rejects.toThrow(/not captured/i);

    const sub = await getSubscriptionDoc(razorpaySubscriptionId);
    expect(sub!.status).toBe('incomplete'); // unchanged
  });

  it('rejects a pending payment the same way as a failed one — no premature entitlement', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const razorpaySubscriptionId = `sub_${crypto.randomUUID()}`;
    await seedSubscription(userId, razorpaySubscriptionId);

    paymentsFetchMock.mockResolvedValue({ status: 'pending' });

    await expect(
      (verifyPayment as any).run(
        callableRequest(
          { razorpaySubscriptionId, razorpayPaymentId: `pay_${crypto.randomUUID()}`, razorpaySignature: 'x' },
          userId
        )
      )
    ).rejects.toThrow(/not captured/i);
  });

  it('cross-user isolation: User A cannot verify/activate User B\'s subscription', async () => {
    const ownerId = `user-${crypto.randomUUID()}`;
    const attackerId = `user-${crypto.randomUUID()}`;
    const razorpaySubscriptionId = `sub_${crypto.randomUUID()}`;
    await seedSubscription(ownerId, razorpaySubscriptionId);

    paymentsFetchMock.mockResolvedValue({ status: 'captured', created_at: Math.floor(Date.now() / 1000) });

    await expect(
      (verifyPayment as any).run(
        callableRequest(
          { razorpaySubscriptionId, razorpayPaymentId: `pay_${crypto.randomUUID()}`, razorpaySignature: 'x' },
          attackerId
        )
      )
    ).rejects.toThrow(/unauthorized|belongs to another user/i);

    const sub = await getSubscriptionDoc(razorpaySubscriptionId);
    expect(sub!.status).toBe('incomplete'); // attacker's call did not activate it
  });

  it('calling verifyPayment multiple times for the same already-captured payment does not create additional credit grants (verifyPayment itself never grants credits — see razorpayWebhook.ts)', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const razorpaySubscriptionId = `sub_${crypto.randomUUID()}`;
    await seedSubscription(userId, razorpaySubscriptionId);
    paymentsFetchMock.mockResolvedValue({ status: 'captured', created_at: Math.floor(Date.now() / 1000) });

    const paymentId = `pay_${crypto.randomUUID()}`;
    await (verifyPayment as any).run(callableRequest({ razorpaySubscriptionId, razorpayPaymentId: paymentId, razorpaySignature: 'x' }, userId));
    await (verifyPayment as any).run(callableRequest({ razorpaySubscriptionId, razorpayPaymentId: paymentId, razorpaySignature: 'x' }, userId));
    await (verifyPayment as any).run(callableRequest({ razorpaySubscriptionId, razorpayPaymentId: paymentId, razorpaySignature: 'x' }, userId));

    // No transaction/credit-grant record is created by this path at all —
    // credit granting is exclusively the webhook's responsibility
    // (documented finding: verifyPayment only flips subscription.status).
    const txSnap = await db.collection('transactions').doc(paymentId).get();
    expect(txSnap.exists).toBe(false);
  });
});
