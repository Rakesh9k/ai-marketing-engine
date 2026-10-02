import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';
import { getDurableDownloadUrl } from '../storageUrls';

/**
 * Persists a generated creative to Firebase Storage. Previously, generated
 * poster/story/reel "imageUrl" values were the raw DALL-E provider URL
 * returned directly from OpenAI — a temporary CDN link that expires
 * (documented OpenAI behavior, typically within about an hour). That URL
 * was written straight into campaign_assets/campaign documents as if it
 * were permanent, so every generated creative became a dead link shortly
 * after generation. This downloads the bytes once and re-hosts them under
 * this project's own Storage bucket, matching the existing asset-storage
 * convention (businesses/{businessId}/...) used elsewhere (see
 * functions/src/functions/assets/getUploadUrl.ts).
 */
export interface UploadedGeneratedAsset {
  url: string;
  storagePath: string;
}

export async function fetchAsBuffer(
  sourceUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download generated image (${response.status} ${response.statusText})`
    );
  }
  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

/**
 * Reads bytes directly from this project's own bucket via the Admin SDK,
 * rather than `fetch()`ing a signed URL — used for compositing (the logo)
 * where the caller already knows the durable storagePath and a signed URL
 * would just be an unnecessary, expiring middleman.
 */
export async function downloadFromStoragePath(
  storagePath: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const file = admin.storage().bucket().file(storagePath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  const contentType = (metadata.contentType as string) || 'image/png';
  return { buffer, contentType };
}

export async function uploadGeneratedAsset(
  businessId: string,
  campaignId: string,
  assetType: 'poster' | 'story' | 'reel',
  buffer: Buffer,
  contentType: string
): Promise<UploadedGeneratedAsset> {
  const assetId = uuidv7();
  const extension = contentType === 'image/svg+xml' ? 'svg' : contentType.split('/')[1] || 'png';
  const storagePath = `businesses/${businessId}/campaigns/${campaignId}/generated/${assetType}_${assetId}.${extension}`;

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType }, resumable: false });

  // F2: durable, non-expiring URL — this function's own doc comment above
  // already documented itself as "the permanent URL fix" for DALL-E's
  // ~1-hour temporary URLs, but a 7-day signed URL was not actually
  // permanent; it just moved the same class of bug a week out.
  const url = await getDurableDownloadUrl(storagePath);

  return { url, storagePath };
}

/**
 * P0-1 (Truth Check gating): deletes generated creatives from a campaign
 * Truth Check rejected. getDurableDownloadUrl's token-bearing
 * `firebasestorage.googleapis.com` URLs are NOT subject to storage.rules —
 * anyone holding the URL can fetch it regardless of Firestore/auth state.
 * Withholding the CampaignAsset's imageUrl from the client (or from
 * Firestore entirely) is therefore not sufficient to actually revoke
 * access; the only real revocation is deleting the underlying object, so a
 * direct request against the old token URL correctly 404s. Best-effort per
 * file — a rejected campaign's status must still flip regardless of any
 * individual Storage delete failing (e.g. object already gone).
 */
export async function deleteGeneratedAssets(storagePaths: string[]): Promise<void> {
  const bucket = admin.storage().bucket();
  await Promise.all(
    storagePaths.map(async (storagePath) => {
      try {
        await bucket.file(storagePath).delete();
      } catch {
        // Already deleted / never existed — nothing further to do.
      }
    })
  );
}
