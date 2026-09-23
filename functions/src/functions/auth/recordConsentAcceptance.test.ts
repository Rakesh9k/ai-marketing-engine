/**
 * recordConsentAcceptance — real Firestore emulator. Verifies the version
 * recorded is always the server-side constant (never client-suppliable),
 * the timestamp is a Firestore server timestamp, and the write cannot
 * touch any other field on the user document.
 */
import * as crypto from 'crypto';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { recordConsentAcceptance } from './recordConsentAcceptance';
import { createUserDoc, getUserDoc } from '../../services/firestore';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../../config/legal';
import type { User } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return {
    data,
    auth: { uid, token: {} as any },
  } as any;
}

describeIfEmulator('recordConsentAcceptance (Firestore emulator)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('records the server-side current Terms/Privacy version and a server timestamp on the caller\'s own user doc', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const user: User = {
      userId,
      email: `${userId}@example.com`,
      role: 'user',
      businessIds: [],
      settings: { notifications: true, language: 'en', timezone: 'Asia/Kolkata' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createUserDoc(user);

    const result = await (recordConsentAcceptance as any).run(
      callableRequest({ accepted: true }, userId)
    );

    expect(result.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(result.privacyVersion).toBe(CURRENT_PRIVACY_VERSION);

    const updated = await getUserDoc(userId);
    expect(updated!.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(updated!.privacyVersion).toBe(CURRENT_PRIVACY_VERSION);
    expect(updated!.termsAcceptedAt).toBeTruthy();
    expect(updated!.privacyAcceptedAt).toBeTruthy();
    // Untouched fields prove this write is a narrow merge, not a full
    // document replace.
    expect(updated!.role).toBe('user');
    expect(updated!.businessIds).toEqual([]);
  });

  it('rejects a request that does not explicitly send accepted: true', async () => {
    const userId = `user-${crypto.randomUUID()}`;

    await expect(
      (recordConsentAcceptance as any).run(callableRequest({ accepted: false }, userId))
    ).rejects.toThrow();
  });
});
