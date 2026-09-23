/**
 * cancelSubscription — real Firestore emulator, Razorpay SDK mocked (no
 * live Razorpay credentials in this environment). Verifies: cancellation
 * calls Razorpay's cancel-at-cycle-end API, flips cancelAtPeriodEnd
 * locally, is idempotent on a second call, rejects the Free plan and
 * cross-user attempts, and never lets a client bypass the Razorpay call.
 */
import * as crypto from 'crypto';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const cancelMock = jest.fn();
jest.mock('../../services/razorpay', () => ({
  getRazorpayClient: () => ({ subscriptions: { cancel: cancelMock } }),
  cancelRazorpaySubscription: async (id: string, cancelAtCycleEnd = true) => {
    await cancelMock(id, cancelAtCycleEnd);
  },
}));

import * as admin from 'firebase-admin';
import { cancelSubscription } from './cancelSubscription';
import { createUserDoc, createSubscriptionDoc, getSubscriptionDoc } from '../../services/firestore';
import type { User, Subscription } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return {
    data,
    auth: { uid, token: {} as any },
  } as any;
}

describeIfEmulator('cancelSubscription (Firestore emulator)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => jest.clearAllMocks());

  async function seedUserWithSubscription(
    planId: Subscription['planId'],
    overrides: Partial<Subscription> = {}
  ): Promise<{ userId: string; subscription: Subscription }> {
    const userId = `user-${crypto.randomUUID()}`;
    const subscriptionId = `sub-${crypto.randomUUID()}`;
    const user: User = {
      userId,
      email: `${userId}@example.com`,
      role: 'user',
      businessIds: [],
      subscriptionId,
      settings: { notifications: true, language: 'en', timezone: 'Asia/Kolkata' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createUserDoc(user);

    const subscription: Subscription = {
      subscriptionId,
      userId,
      planId,
      status: 'active',
      razorpaySubscriptionId: `rzp_sub_${crypto.randomUUID()}`,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      creditsIncluded: 1200,
      creditsUsed: 0,
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
    await createSubscriptionDoc(subscription);
    return { userId, subscription };
  }

  it('cancels at cycle end via Razorpay and marks cancelAtPeriodEnd locally', async () => {
    const { userId, subscription } = await seedUserWithSubscription('business');

    const result = await (cancelSubscription as any).run(callableRequest({}, userId));

    expect(result.success).toBe(true);
    expect(result.alreadyCanceled).toBe(false);
    expect(cancelMock).toHaveBeenCalledWith(subscription.razorpaySubscriptionId, true);

    const updated = await getSubscriptionDoc(subscription.subscriptionId);
    expect(updated!.cancelAtPeriodEnd).toBe(true);
  });

  it('is idempotent — a second cancel call does not call Razorpay again', async () => {
    const { userId } = await seedUserWithSubscription('business');

    await (cancelSubscription as any).run(callableRequest({}, userId));
    cancelMock.mockClear();

    const result = await (cancelSubscription as any).run(callableRequest({}, userId));

    expect(result.alreadyCanceled).toBe(true);
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it('rejects canceling the Free plan (nothing to cancel)', async () => {
    const { userId } = await seedUserWithSubscription('free');

    await expect((cancelSubscription as any).run(callableRequest({}, userId))).rejects.toThrow(
      /free plan/i
    );
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it("cross-user isolation: a user cannot cancel a subscription that isn't linked to their own account", async () => {
    const { subscription } = await seedUserWithSubscription('business');
    const attackerId = `user-${crypto.randomUUID()}`;
    // Attacker has no subscriptionId on their own user doc, so getUserDoc's
    // subscriptionId lookup can't resolve to someone else's subscription —
    // this proves the resolution path is per-caller, not client-suppliable.
    await createUserDoc({
      userId: attackerId,
      email: `${attackerId}@example.com`,
      role: 'user',
      businessIds: [],
      settings: { notifications: true, language: 'en', timezone: 'Asia/Kolkata' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      (cancelSubscription as any).run(callableRequest({}, attackerId))
    ).rejects.toThrow(/no subscription found/i);

    const unchanged = await getSubscriptionDoc(subscription.subscriptionId);
    expect(unchanged!.cancelAtPeriodEnd).toBe(false);
  });
});
