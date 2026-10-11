import * as admin from 'firebase-admin';
import type { ReelProject } from '../types';

/** Signed V4 read URLs are capped at 7 days by Cloud Storage. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** A real 15s+ vertical MP4 is hundreds of KB; anything smaller is a stub/corrupt upload. */
export const MIN_REEL_BYTES = 10_000;

/**
 * Proves the rendered output really exists in Storage before a reel may be called complete.
 * The renderer returning 200 is not evidence on its own (the old code signed a URL for a path
 * it never looked at, so a missing/empty object still produced status "completed").
 */
export async function assertStoredObject(
  storagePath: string,
  minBytes: number,
  label: string
): Promise<void> {
  const file = admin.storage().bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`${label} was not found in storage after rendering`);
  }
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size ?? 0);
  if (!Number.isFinite(size) || size < minBytes) {
    throw new Error(`${label} in storage is empty or truncated (${size} bytes)`);
  }
}

/** Short-lived signed read URL. Pass `downloadFileName` to force a file download. */
export async function signReadUrl(
  storagePath: string,
  options: { downloadFileName?: string } = {}
): Promise<string> {
  const [url] = await admin
    .storage()
    .bucket()
    .file(storagePath)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SEVEN_DAYS_MS,
      ...(options.downloadFileName
        ? { responseDisposition: `attachment; filename="${options.downloadFileName}"` }
        : {}),
    });
  return url;
}

/**
 * The URLs stored on a reel document expire after 7 days, so a reel opened later would show a
 * dead player and a dead Download button. Callers re-derive them from the durable storage
 * paths on every read. Reels that are not completed are returned untouched, and a signing
 * failure never hides the reel (its stored URLs are kept).
 */
export async function withFreshReelUrls<T extends ReelProject>(reel: T): Promise<T> {
  if (reel.status !== 'completed' || !reel.outputStoragePath) return reel;
  try {
    const [outputUrl, downloadUrl, thumbnailUrl] = await Promise.all([
      signReadUrl(reel.outputStoragePath),
      signReadUrl(reel.outputStoragePath, { downloadFileName: `mitra-reel-${reel.reelId}.mp4` }),
      reel.thumbnailStoragePath ? signReadUrl(reel.thumbnailStoragePath) : undefined,
    ]);
    return { ...reel, outputUrl, downloadUrl, ...(thumbnailUrl ? { thumbnailUrl } : {}) };
  } catch {
    return reel;
  }
}
