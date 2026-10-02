/**
 * Phase 37 QA Remediation (D-1) — confirmReelClipUpload has the same
 * defense-in-depth storagePath ownership check as confirmUpload.ts (see
 * confirmReelClipUpload.ts:54-69), but had no regression test proving it
 * holds. Mirrors functions/src/functions/assets/confirmUpload.test.ts's
 * cross-business and unscoped-path cases, and adds a same-business success
 * case (confirmUpload.test.ts has no equivalent) to prove the check does
 * not break legitimate uploads.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { confirmReelClipUpload } from './confirmReelClipUpload';
import {
  createBusinessDoc,
  createReelProjectDoc,
  getAssetDoc,
  getReelProjectDoc,
} from '../../services/firestore';
import type { Business, ReelProject } from '../../types';

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

function makeReel(reelId: string, businessId: string, userId: string): ReelProject {
  const now = new Date().toISOString();
  return {
    reelId,
    businessId,
    userId,
    status: 'draft',
    goal: 'food_showcase',
    style: 'fast_engaging',
    durationSeconds: 15,
    inputClipIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

const clipMetadata = {
  originalName: 'clip.mp4',
  mimeType: 'video/mp4',
  size: 1024,
};

describeIfEmulator('confirmReelClipUpload — storagePath ownership (Phase 37 D-1)', () => {
  afterAll(async () => {
    await admin.app().delete();
  });

  it('CRITICAL: rejects a storagePath belonging to a different business than the caller-owned businessId', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const reelId = `reel-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createReelProjectDoc(makeReel(reelId, businessId, ownerId));

    const foreignStoragePath = `businesses/some-other-business-id/reels/${reelId}/input/1.mp4`;

    await expect(
      (confirmReelClipUpload as any).run(
        callableRequest(
          {
            businessId,
            reelId,
            clipId: uuid(),
            storagePath: foreignStoragePath,
            metadata: clipMetadata,
          },
          ownerId
        )
      )
    ).rejects.toThrow(/storagePath does not belong to businessId|permission-denied/i);

    // No side effects: reel untouched, no asset created for the foreign path.
    const reelAfter = await getReelProjectDoc(reelId);
    expect(reelAfter?.inputClipIds).toEqual([]);
    expect(reelAfter?.status).toBe('draft');
  });

  it('rejects a storagePath with no business prefix at all', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const reelId = `reel-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createReelProjectDoc(makeReel(reelId, businessId, ownerId));

    await expect(
      (confirmReelClipUpload as any).run(
        callableRequest(
          {
            businessId,
            reelId,
            clipId: uuid(),
            storagePath: 'temp/not-scoped.mp4',
            metadata: clipMetadata,
          },
          ownerId
        )
      )
    ).rejects.toThrow();

    const reelAfter = await getReelProjectDoc(reelId);
    expect(reelAfter?.inputClipIds).toEqual([]);
  });

  it('accepts a valid storagePath under the caller-owned business and records the clip', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const reelId = `reel-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createReelProjectDoc(makeReel(reelId, businessId, ownerId));

    const storagePath = `businesses/${businessId}/reels/${reelId}/input/${uuid()}.mp4`;
    const bucket = admin.storage().bucket();
    await bucket.file(storagePath).save(Buffer.from('fake clip bytes'), {
      metadata: { contentType: 'video/mp4' },
      resumable: false,
    });

    const result = await (confirmReelClipUpload as any).run(
      callableRequest(
        { businessId, reelId, clipId: uuid(), storagePath, metadata: clipMetadata },
        ownerId
      )
    );

    expect(result.assetId).toBeTruthy();
    expect(result.downloadURL).toContain('http');
    expect(result.asset.storagePath).toBe(storagePath);

    const persistedAsset = await getAssetDoc(result.assetId);
    expect(persistedAsset?.businessId).toBe(businessId);
    expect(persistedAsset?.storagePath).toBe(storagePath);

    const reelAfter = await getReelProjectDoc(reelId);
    expect(reelAfter?.inputClipIds).toContain(result.assetId);
    expect(reelAfter?.status).toBe('uploading');
  });

  // Phase 4 Storage Security Audit — same fix as confirmUpload.test.ts: the
  // signed URL from getReelClipUploadUrl.ts only constrains the Content-Type
  // header, never the byte count, and `metadata` below is the caller's own
  // unverified claim. The equivalent "real object exceeds the size limit"
  // case is proven by confirmUpload.test.ts's 10MB-image test instead of
  // being repeated here at 200MB: the Storage emulator's own request-body
  // cap rejects an upload that large before this function's code ever runs,
  // which would only test the emulator, not confirmReelClipUpload — the
  // size check below is the exact same `realSize > MAX_..._BYTES` branch
  // confirmUpload.ts already exercises against a real oversized object.
  it('CRITICAL: rejects an uploaded clip whose real content-type is not an allowed video type, even if the client claims video/mp4', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const reelId = `reel-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));
    await createReelProjectDoc(makeReel(reelId, businessId, ownerId));

    const storagePath = `businesses/${businessId}/reels/${reelId}/input/${uuid()}.mp4`;
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(Buffer.from('#!/bin/sh\necho pwned\n'), {
        metadata: { contentType: 'application/x-sh' },
        resumable: false,
      });

    await expect(
      (confirmReelClipUpload as any).run(
        callableRequest(
          { businessId, reelId, clipId: uuid(), storagePath, metadata: clipMetadata },
          ownerId
        )
      )
    ).rejects.toThrow(/size limit|not a supported video type/i);

    const [stillExists] = await admin.storage().bucket().file(storagePath).exists();
    expect(stillExists).toBe(false);
  });
});
