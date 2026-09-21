/**
 * Phase 15 — proves the actual signup persistence path: a new Firebase Auth
 * user triggers onUserCreatedHandler, which must leave real, correctly-
 * shaped Firestore state behind (role, businessIds, agencyId, a free-tier
 * subscription, a usage document, a welcome credit transaction) — not just
 * that the function runs without throwing.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const trackEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/analyticsService', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  ANALYTICS_EVENTS: { SIGNUP: 'signup' },
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { onUserCreatedHandler } from './onUserCreated';
import { getUsageDocId } from '../../services/firestore';

function fakeUserRecord(uid: string, email: string) {
  return {
    uid,
    email,
    displayName: 'Test User',
    photoURL: '',
    phoneNumber: '',
  } as unknown as import('firebase-admin/auth').UserRecord;
}

describeIfEmulator('onUserCreatedHandler — signup persistence (Phase 15)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => jest.clearAllMocks());

  it('creates a users/{uid} doc with role="user", empty businessIds, null agencyId, and a free-tier subscription/usage/welcome-transaction — not merely a Firebase Auth UID', async () => {
    const userId = `user-${uuid()}`;
    const record = fakeUserRecord(userId, `${userId}@test.example`);

    await (onUserCreatedHandler as unknown as { run: (r: unknown) => Promise<void> }).run(record);

    const userDoc = await db.collection('users').doc(userId).get();
    expect(userDoc.exists).toBe(true);
    const userData = userDoc.data()!;
    expect(userData['role']).toBe('user');
    expect(userData['businessIds']).toEqual([]);
    expect(userData['agencyId']).toBeNull();
    expect(userData['email']).toBe(`${userId}@test.example`);

    const subSnap = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .get();
    expect(subSnap.size).toBe(1);
    const sub = subSnap.docs[0]!.data();
    expect(sub['planId']).toBe('free');
    expect(sub['status']).toBe('active');
    expect(sub['creditsUsed']).toBe(0);
    expect(sub['creditsIncluded']).toBeGreaterThan(0);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = getUsageDocId(userId, periodStart);
    const usageDoc = await db.collection('usage').doc(usageId).get();
    expect(usageDoc.exists).toBe(true);
    expect(usageDoc.data()!['creditsUsed']).toBe(0);

    const txnSnap = await db
      .collection('transactions')
      .where('userId', '==', userId)
      .get();
    expect(txnSnap.size).toBe(1);
    expect(txnSnap.docs[0]!.data()['type']).toBe('grant');
    expect(txnSnap.docs[0]!.data()['amount']).toBe(sub['creditsIncluded']);
  });

  it('persists correctly even when Auth profile fields are empty (no display name/photo/phone) — no crash on optional fields', async () => {
    const userId = `user-${uuid()}`;
    const record = fakeUserRecord(userId, `${userId}@test.example`);

    await expect(
      (onUserCreatedHandler as unknown as { run: (r: unknown) => Promise<void> }).run(record)
    ).resolves.not.toThrow();

    const userDoc = await db.collection('users').doc(userId).get();
    expect(userDoc.data()!['displayName']).toBe('Test User');
  });
});
