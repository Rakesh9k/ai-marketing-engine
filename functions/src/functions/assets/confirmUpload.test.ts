/**
 * Phase 2 Security Audit — proves confirmUpload rejects a storagePath that
 * does not belong to the caller's verified businessId, even when the
 * caller legitimately owns businessId (an IDOR that would otherwise let a
 * user mint a 7-day admin-signed download URL for another business's
 * Storage object and attach it to their own campaign_assets record, since
 * admin.storage() bypasses storage.rules entirely). See confirmUpload.ts.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { confirmUpload } from './confirmUpload';
import { createBusinessDoc } from '../../services/firestore';
import type { Business } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(businessId: string, userId: string): Business {
  return {
    businessId,
    userId,
    name: 'Test Restaurant',
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

describeIfEmulator('confirmUpload — storagePath ownership (Phase 2 Security Audit)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('CRITICAL: rejects a storagePath belonging to a different business than the caller-owned businessId', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    // storagePath points at a DIFFERENT business's folder even though the
    // caller genuinely owns `businessId` — this must be denied regardless
    // of whether the referenced object exists.
    const foreignStoragePath = `businesses/some-other-business-id/products/${uuid()}/1.png`;

    await expect(
      (confirmUpload as any).run(
        callableRequest(
          { businessId, storagePath: foreignStoragePath, assetType: 'product' },
          ownerId
        )
      )
    ).rejects.toThrow(/storagePath does not belong to businessId|permission-denied/i);
  });

  it('rejects a storagePath with no business prefix at all', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(
      (confirmUpload as any).run(
        callableRequest({ businessId, storagePath: 'temp/not-scoped.png' }, ownerId)
      )
    ).rejects.toThrow();
  });
});
