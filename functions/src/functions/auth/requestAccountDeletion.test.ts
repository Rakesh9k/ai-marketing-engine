/**
 * requestAccountDeletion — real Firestore emulator for the audit-trail
 * write; admin.auth().deleteUser is spied/mocked so this test never touches
 * real Firebase Authentication (no Auth emulator is guaranteed running
 * alongside the Firestore emulator in this suite).
 */
import * as crypto from 'crypto';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { requestAccountDeletion } from './requestAccountDeletion';
import { createUserDoc, createSubscriptionDoc } from '../../services/firestore';
import type { User, Subscription } from '../../types';

function callableRequest(data: unknown, uid: string, authTimeSecondsAgo = 0) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    data,
    auth: { uid, token: { auth_time: nowSeconds - authTimeSecondsAgo } as any },
  } as any;
}

async function seedUserWithSubscription(
  overrides: Partial<Subscription>
): Promise<{ userId: string }> {
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
    planId: 'business',
    status: 'active',
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
  return { userId };
}

describeIfEmulator('requestAccountDeletion (Firestore emulator, Auth mocked)', () => {
  const db = admin.firestore();
  let deleteUserMock: jest.Mock;

  beforeEach(() => {
    deleteUserMock = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(admin, 'auth').mockReturnValue({ deleteUser: deleteUserMock } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await admin.app().delete();
  });

  it('deletes the Auth user and writes a completed audit-trail record with a server timestamp', async () => {
    const userId = `user-${crypto.randomUUID()}`;

    const result = await (requestAccountDeletion as any).run(
      callableRequest({ confirm: true }, userId, 60)
    );

    expect(result.success).toBe(true);
    expect(deleteUserMock).toHaveBeenCalledWith(userId);

    const doc = await db.collection('accountDeletionRequests').doc(userId).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()!['status']).toBe('completed');
    expect(doc.data()!['requestedAt']).toBeTruthy();
    expect(doc.data()!['completedAt']).toBeTruthy();
  });

  it('rejects when the caller has not authenticated recently (stale token, no re-auth flow to bypass)', async () => {
    const userId = `user-${crypto.randomUUID()}`;

    await expect(
      (requestAccountDeletion as any).run(
        callableRequest({ confirm: true }, userId, 60 * 60) // 1 hour ago
      )
    ).rejects.toThrow(/sign out and sign back in/i);

    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('blocks deletion when the caller has an active, still-renewing paid subscription', async () => {
    const { userId } = await seedUserWithSubscription({
      planId: 'business',
      status: 'active',
      cancelAtPeriodEnd: false,
    });

    await expect(
      (requestAccountDeletion as any).run(callableRequest({ confirm: true }, userId, 60))
    ).rejects.toThrow(/active subscription/i);

    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('allows deletion when the subscription is already set to cancel at period end (no renewal risk)', async () => {
    const { userId } = await seedUserWithSubscription({
      planId: 'business',
      status: 'active',
      cancelAtPeriodEnd: true,
    });

    const result = await (requestAccountDeletion as any).run(
      callableRequest({ confirm: true }, userId, 60)
    );

    expect(result.success).toBe(true);
    expect(deleteUserMock).toHaveBeenCalledWith(userId);
  });

  it('allows deletion when the subscription is already canceled', async () => {
    const { userId } = await seedUserWithSubscription({
      planId: 'business',
      status: 'canceled',
      cancelAtPeriodEnd: true,
    });

    const result = await (requestAccountDeletion as any).run(
      callableRequest({ confirm: true }, userId, 60)
    );

    expect(result.success).toBe(true);
    expect(deleteUserMock).toHaveBeenCalledWith(userId);
  });

  it('allows deletion on the Free plan', async () => {
    const { userId } = await seedUserWithSubscription({
      planId: 'free',
      status: 'active',
      cancelAtPeriodEnd: false,
    });

    const result = await (requestAccountDeletion as any).run(
      callableRequest({ confirm: true }, userId, 60)
    );

    expect(result.success).toBe(true);
    expect(deleteUserMock).toHaveBeenCalledWith(userId);
  });
});
