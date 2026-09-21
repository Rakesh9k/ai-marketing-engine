import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

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

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days, matching confirmUpload.ts's existing convention
  });

  return { url, storagePath };
}
