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

  // F2 (Pass 2) — proves getDurableDownloadUrl actually works against a
  // real (emulated) Storage backend, not just a mock: the returned URL is
  // token-based and firebasestorage.googleapis.com-hosted, never a 7-day
  // V4-signed storage.googleapis.com URL, and it's genuinely fetchable.
  it('F2: returns a durable, non-expiring, fetchable download URL for a real uploaded file', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    const storagePath = `businesses/${businessId}/products/${uuid()}/1.png`;
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(Buffer.from('fake-png-bytes'), { metadata: { contentType: 'image/png' } });

    const result = await (confirmUpload as any).run(
      callableRequest(
        {
          businessId,
          storagePath,
          assetType: 'product',
          metadata: { originalName: '1.png', mimeType: 'image/png', size: 14 },
        },
        ownerId
      )
    );

    // https://firebasestorage.googleapis.com in production; the Storage
    // emulator (FIREBASE_STORAGE_EMULATOR_HOST, set for this test run)
    // serves the same REST shape on its own local http host instead.
    expect(result.downloadURL).toMatch(
      /^https?:\/\/[^/]+\/v0\/b\/[^/]+\/o\/.+\?alt=media&token=.+$/
    );

    const fetched = await fetch(result.downloadURL);
    expect(fetched.ok).toBe(true);
    const body = Buffer.from(await fetched.arrayBuffer());
    expect(body.toString()).toBe('fake-png-bytes');
  });

  // Phase 4 Storage Security Audit: the signed URL from getUploadUrl.ts only
  // constrains the Content-Type header, never the byte count, and the
  // `metadata.size`/`mimeType` fields below are the caller's own unverified
  // claim. These prove confirmUpload re-derives the real object's size/type
  // from Storage itself and rejects (deleting the object) rather than
  // trusting the claim.
  it('CRITICAL: rejects an uploaded object that actually exceeds the size limit, even if the client claims a small size', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    const storagePath = `businesses/${businessId}/products/${uuid()}/big.png`;
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(oversized, { metadata: { contentType: 'image/png' } });

    await expect(
      (confirmUpload as any).run(
        callableRequest(
          {
            businessId,
            storagePath,
            assetType: 'product',
            // Claimed size is well within limits — only the real object
            // (checked server-side via file.getMetadata()) is oversized.
            metadata: { originalName: 'big.png', mimeType: 'image/png', size: 14 },
          },
          ownerId
        )
      )
    ).rejects.toThrow(/size limit|not a supported image type/i);

    const [stillExists] = await admin.storage().bucket().file(storagePath).exists();
    expect(stillExists).toBe(false);
  });

  it('CRITICAL: rejects an uploaded object whose real content-type is not an allowed image type, even if the client claims image/png', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    const storagePath = `businesses/${businessId}/products/${uuid()}/not-really-an-image`;
    await admin
      .storage()
      .bucket()
      .file(storagePath)
      .save(Buffer.from('#!/bin/sh\necho pwned\n'), {
        metadata: { contentType: 'application/x-sh' },
      });

    await expect(
      (confirmUpload as any).run(
        callableRequest(
          {
            businessId,
            storagePath,
            assetType: 'product',
            metadata: { originalName: 'not-really-an-image', mimeType: 'image/png', size: 14 },
          },
          ownerId
        )
      )
    ).rejects.toThrow(/size limit|not a supported image type/i);

    const [stillExists] = await admin.storage().bucket().file(storagePath).exists();
    expect(stillExists).toBe(false);
  });
});
