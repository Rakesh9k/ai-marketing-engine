import * as admin from 'firebase-admin';
import * as path from 'path';

/**
 * Thin wrapper over the default Firebase Storage bucket. Cloud Run's
 * attached service account needs roles/storage.objectAdmin on this bucket
 * (documented in README.md) — there is no separate credential to configure,
 * firebase-admin picks up Cloud Run's metadata-server credentials
 * automatically via applicationDefault().
 */
const DEFAULT_BUCKET = 'brainwise-ai-marketing-engine.firebasestorage.app';

function getBucketName(): string {
  return (
    process.env.STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    (process.env.GCLOUD_PROJECT ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app` : undefined) ||
    (process.env.GOOGLE_CLOUD_PROJECT ? `${process.env.GOOGLE_CLOUD_PROJECT}.firebasestorage.app` : undefined) ||
    DEFAULT_BUCKET
  );
}

let initialized = false;
function ensureInitialized(): void {
  if (initialized) return;
  if (admin.apps.length === 0) {
    const bucketName = getBucketName();
    admin.initializeApp({ storageBucket: bucketName });
  }
  initialized = true;
}

export function getBucket() {
  ensureInitialized();
  const bucketName = getBucketName();
  return admin.storage().bucket(bucketName);
}

export async function downloadToFile(storagePath: string, localPath: string): Promise<void> {
  const bucket = getBucket();
  await bucket.file(storagePath).download({ destination: localPath });
}

export async function uploadFile(
  localPath: string,
  storagePath: string,
  contentType: string
): Promise<void> {
  const bucket = getBucket();
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType },
  });
}

/** Matches DevMockVideoRenderer's thumbnail-path convention exactly. */
export function thumbnailPathFor(storagePath: string): string {
  return storagePath.replace(/\.[^/.]+$/, '_thumb.jpg');
}

export function localFileNameFor(storagePath: string): string {
  return path.basename(storagePath);
}
