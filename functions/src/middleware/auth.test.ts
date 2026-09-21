/**
 * Phase 10 — verifyBusinessAccess is the shared authorization primitive now
 * used directly by generateCampaignStrategy, regenerateAsset (indirectly,
 * via an explicit campaign.userId check), and 18 other callables, after
 * fixing a bug where every one of them called
 * verifyAuthAndBusinessAccess(context as any, ...) with `context` shaped as
 * {userId, token} instead of a real CallableRequest — which meant
 * request.auth was always undefined and the check always threw
 * "Authentication required", regardless of the caller's actual
 * authentication. Since context.userId is already the real, verified uid
 * (validatedCallable already checked request.auth before calling the
 * handler), the fix was to call verifyBusinessAccess(context.userId,
 * businessId) directly. This file proves verifyBusinessAccess itself
 * correctly grants/denies access, since it is now the sole authorization
 * gate for business-scoped financial operations like campaign generation
 * (which reserves credits).
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { verifyBusinessAccess } from './auth';
import { createBusinessDoc } from '../services/firestore';
import type { Business } from '../types';

describeIfEmulator('verifyBusinessAccess (Firestore emulator, Phase 10)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  function makeBusiness(businessId: string, ownerId: string): Business {
    return {
      businessId,
      userId: ownerId,
      name: 'Test Business',
      category: 'restaurant',
      location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
      contact: { phone: '9876543210', whatsapp: '9876543210' },
      businessBrain: {} as Business['businessBrain'],
      settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Business;
  }

  it('allows the owning user access to their own business', async () => {
    const businessId = `biz_${uuid()}`;
    const ownerId = `user_${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(verifyBusinessAccess(ownerId, businessId)).resolves.toBeUndefined();
  });

  it('DENIES a different user access to a business they do not own — this is the check every credit-reserving callable now depends on', async () => {
    const businessId = `biz_${uuid()}`;
    const ownerId = `user_${uuid()}`;
    const attackerId = `user_${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(verifyBusinessAccess(attackerId, businessId)).rejects.toThrow(HttpsError);
    await expect(verifyBusinessAccess(attackerId, businessId)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects access to a nonexistent business rather than silently allowing it', async () => {
    await expect(verifyBusinessAccess(`user_${uuid()}`, `biz_never_created_${uuid()}`)).rejects.toMatchObject(
      { code: 'not-found' }
    );
  });
});
