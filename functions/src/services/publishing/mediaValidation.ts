import * as admin from 'firebase-admin';
import type { PublishPlatform, PublishContentType } from '../../types/publishing';

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

/**
 * Validates media URL and resolves Firebase Storage paths to accessible signed/public URLs if necessary.
 */
export async function validateAndResolveMedia(
  mediaUrl: string,
  _platform: PublishPlatform,
  contentType: PublishContentType
): Promise<string> {
  if (!mediaUrl || typeof mediaUrl !== 'string' || mediaUrl.trim() === '') {
    throw new MediaValidationError('Media URL is required and cannot be empty');
  }

  const trimmed = mediaUrl.trim();

  // If Firebase Storage gs:// URI or storage path without http, generate a signed URL
  if (trimmed.startsWith('gs://')) {
    try {
      const bucketAndPath = trimmed.replace('gs://', '');
      const firstSlash = bucketAndPath.indexOf('/');
      if (firstSlash === -1) {
        throw new Error('Invalid gs:// URI format');
      }
      const bucketName = bucketAndPath.slice(0, firstSlash);
      const filePath = bucketAndPath.slice(firstSlash + 1);
      const file = admin.storage().bucket(bucketName).file(filePath);

      // Sign URL valid for 2 hours (Meta Graph API ingests immediately)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 2 * 60 * 60 * 1000,
      });
      return signedUrl;
    } catch (err) {
      throw new MediaValidationError(
        `Failed to resolve Firebase Storage URI: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new MediaValidationError('Media URL must be a valid HTTP or HTTPS URL');
  }

  // Basic extension / content type sanity check
  const lower = trimmed.toLowerCase();

  if (contentType === 'reel') {
    const isVideo =
      lower.includes('.mp4') ||
      lower.includes('.mov') ||
      lower.includes('video') ||
      lower.includes('reel');
    if (!isVideo && !lower.includes('storage.googleapis.com')) {
      // Warn or enforce video requirement
      throw new MediaValidationError('Reel content requires a video file (.mp4 or .mov)');
    }
  }

  return trimmed;
}
