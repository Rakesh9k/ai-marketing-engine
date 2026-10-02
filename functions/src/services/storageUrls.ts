import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * F2 (Pass 2 fix plan) — durable asset references.
 *
 * Every asset URL previously stored as "the" reference (product images,
 * generated campaign posters/stories, brand logos before Pass 1) was a V4
 * signed URL with a 7-day expiry, persisted into Firestore as if it were
 * permanent. After 7 days: product photos silently stopped reaching the
 * vision pipeline (fetch() got a 403, swallowed, and the analysis quietly
 * degraded to text-only), and campaign history pages/downloads broke for
 * any campaign older than a week.
 *
 * This returns the SAME kind of URL the Firebase client SDK's
 * `getDownloadURL()` produces: a token-bearing
 * `firebasestorage.googleapis.com` URL that does not expire (the token is
 * only invalidated if explicitly rotated — never by time). `storagePath`
 * remains the actual durable reference; this is "controlled URL
 * generation" from it, not a replacement for it. Firestore records should
 * store both the storagePath and this URL — the URL for direct rendering/
 * fetching, the storagePath so a URL can always be regenerated (e.g. after
 * an intentional token rotation) without re-uploading anything.
 */
export async function getDurableDownloadUrl(storagePath: string): Promise<string> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const [metadata] = await file.getMetadata();
  const existingTokens =
    (metadata.metadata?.['firebaseStorageDownloadTokens'] as string | undefined | null) || '';
  let token = existingTokens.split(',')[0];

  if (!token) {
    token = uuidv4();
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  }

  const encodedPath = encodeURIComponent(storagePath);
  // The Storage emulator serves the same REST shape on its own local host
  // rather than the real Google domain — without this, every URL this
  // function issues would be unreachable in emulator/dev/test environments
  // (only the FIREBASE_STORAGE_EMULATOR_HOST env var, set by
  // connectStorageEmulator/firebase emulators:start, indicates this).
  const emulatorHost = process.env['FIREBASE_STORAGE_EMULATOR_HOST'];
  const origin = emulatorHost ? `http://${emulatorHost}` : 'https://firebasestorage.googleapis.com';
  return `${origin}/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}
