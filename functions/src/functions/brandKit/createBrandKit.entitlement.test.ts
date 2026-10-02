/**
 * TC-PLAN-005 (docs/P0_HARDENING_TRACKER.md) — mandatory: calling the real
 * Cloud Function callable directly, as a Free-plan user, with no frontend
 * involved at all, must still be rejected. This is the test that actually
 * proves enforcement is server-side, not merely a hidden button — a
 * `requireFeature` unit test alone (entitlements.test.ts) only proves the
 * check exists, not that the real callable actually calls it.
 */
import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createBrandKit } from './createBrandKit';
import { createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

async function makeBusinessAndUser(userId: string): Promise<string> {
  const businessId = `biz-${uuid()}`;
  const db = admin.firestore();
  await createBusinessDoc({
    businessId,
    userId,
    name: 'Test Business',
    category: 'restaurant',
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Business);
  // No usage/subscription doc seeded at all — a brand-new user with no
  // active subscription, which is exactly what getUserEntitlements treats
  // as the Free plan (see entitlements.ts's doc comments).
  await db
    .collection('users')
    .doc(userId)
    .set({ userId, businessIds: [businessId], role: 'user' });
  return businessId;
}

function makeCreateBrandKitInput(businessId: string) {
  return {
    businessId,
    colors: { primary: '#E84D1A', background: '#FFFFFF', text: '#1A1A1A' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    tone: 'friendly' as const,
  };
}

describeIfEmulator(
  'createBrandKit — plan-tier enforcement is server-side, not UI-only (TC-PLAN-005)',
  () => {
    afterAll(async () => {
      await admin.app().delete();
    });

    it('a Free-plan user calling the real callable directly (no frontend) is still rejected', async () => {
      const userId = `user-${uuid()}`;
      const businessId = await makeBusinessAndUser(userId);

      await expect(
        (createBrandKit as any).run(callableRequest(makeCreateBrandKitInput(businessId), userId))
      ).rejects.toThrow(/brandKit.*not available|plan/i);

      // And no brand kit document was created as a side effect of the
      // rejected attempt.
      const db = admin.firestore();
      const brandKitSnap = await db.collection('brand_kits').doc(businessId).get();
      expect(brandKitSnap.exists).toBe(false);
    });
  }
);
