import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import { reelConverter } from '@/lib/firebase/converters';
import { callFunction } from '@/services/api';
import { generateUUID } from '@/lib/utils';
import type { ReelDurationSeconds, ReelGoal, ReelProject, ReelStyle } from '@/types';
import { validateClipFile } from './reelClipValidation';

export interface CreateReelProjectRequest {
  businessId: string;
  goal: ReelGoal;
  style: ReelStyle;
  durationSeconds: ReelDurationSeconds;
  offer?: string;
  cta?: string;
  additionalMessage?: string;
}

export interface CreateReelProjectResponse {
  reelId: string;
  reel: ReelProject;
}

/**
 * Creates a new Reel project. Must be called before any clips can be
 * uploaded, since clip storage paths are scoped to the reelId.
 */
export async function createReelProject(
  request: CreateReelProjectRequest
): Promise<CreateReelProjectResponse> {
  return callFunction<CreateReelProjectRequest, CreateReelProjectResponse>({
    functionName: 'createReelProject',
    data: request,
  });
}

export interface GetReelClipUploadUrlRequest {
  businessId: string;
  reelId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface GetReelClipUploadUrlResponse {
  uploadUrl: string;
  storagePath: string;
  clipId: string;
  expiresAt: string;
}

async function getReelClipUploadUrl(
  request: GetReelClipUploadUrlRequest
): Promise<GetReelClipUploadUrlResponse> {
  return callFunction<GetReelClipUploadUrlRequest, GetReelClipUploadUrlResponse>({
    functionName: 'getReelClipUploadUrl',
    data: request,
  });
}

export interface ConfirmReelClipUploadRequest {
  businessId: string;
  reelId: string;
  clipId: string;
  storagePath: string;
  metadata: {
    originalName: string;
    mimeType: string;
    size: number;
  };
}

export interface ConfirmReelClipUploadResponse {
  assetId: string;
  asset: Record<string, unknown>;
  downloadURL: string;
}

async function confirmReelClipUpload(
  request: ConfirmReelClipUploadRequest
): Promise<ConfirmReelClipUploadResponse> {
  return callFunction<ConfirmReelClipUploadRequest, ConfirmReelClipUploadResponse>({
    functionName: 'confirmReelClipUpload',
    data: request,
  });
}

export interface UploadedReelClip {
  clipId: string;
  assetId: string;
  storagePath: string;
  downloadURL: string;
  fileName: string;
  size: number;
}

/**
 * Uploads a single raw clip for a Reel project: validate -> get signed URL ->
 * PUT to storage -> confirm upload. Mirrors the image upload flow in
 * `assetService.ts`, adapted for video (no client-side compression for MVP).
 *
 * @param onProgress - optional callback invoked with 0-100 as the PUT
 * request progresses (uses XHR under the hood so we can report progress,
 * since fetch does not expose upload progress events).
 */
export async function uploadReelClip(
  file: File,
  businessId: string,
  reelId: string,
  onProgress?: (percent: number) => void
): Promise<UploadedReelClip> {
  const validationError = validateClipFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const { uploadUrl, storagePath, clipId } = await getReelClipUploadUrl({
    businessId,
    reelId,
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  });

  await putFileWithProgress(uploadUrl, file, onProgress);

  const { assetId, downloadURL } = await confirmReelClipUpload({
    businessId,
    reelId,
    clipId,
    storagePath,
    metadata: {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    },
  });

  return {
    clipId,
    assetId,
    storagePath,
    downloadURL,
    fileName: file.name,
    size: file.size,
  };
}

function putFileWithProgress(
  url: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed: network error'));
    };

    xhr.send(file);
  });
}

export interface GenerateReelRequest {
  businessId: string;
  reelId: string;
}

export interface GenerateReelResponse {
  reelId: string;
  reel: ReelProject;
  outputUrl?: string;
  thumbnailUrl?: string;
  alreadyInProgress?: boolean;
}

/**
 * Kicks off server-side rendering for a Reel project. Generates a fresh
 * idempotency key per call so retries from the same click don't double-charge.
 * If a generation is already running for this reelId, the backend responds
 * with `alreadyInProgress: true` instead of an error.
 */
export async function generateReel(request: GenerateReelRequest): Promise<GenerateReelResponse> {
  return callFunction<GenerateReelRequest & { idempotencyKey: string }, GenerateReelResponse>({
    functionName: 'generateReel',
    data: { ...request, idempotencyKey: generateUUID() },
  });
}

export interface GetReelRequest {
  businessId: string;
  reelId: string;
}

export interface GetReelResponse {
  reel: ReelProject;
}

export async function getReel(request: GetReelRequest): Promise<GetReelResponse> {
  return callFunction<GetReelRequest, GetReelResponse>({
    functionName: 'getReel',
    data: request,
  });
}

export interface ListReelsRequest {
  businessId: string;
  limit?: number;
}

export interface ListReelsResponse {
  reels: ReelProject[];
  lastDoc?: unknown;
}

export async function listReels(request: ListReelsRequest): Promise<ListReelsResponse> {
  return callFunction<ListReelsRequest, ListReelsResponse>({
    functionName: 'listReels',
    data: request,
  });
}

/**
 * Subscribes to realtime updates for a Reel project's Firestore document, so
 * the progress UI can react to status changes as the backend pipeline
 * (analyzing -> planning -> rendering -> completed/failed) advances.
 */
export function watchReel(
  reelId: string,
  onChange: (reel: ReelProject | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) {
    onError?.(new Error('Firestore not initialized'));
    return () => {};
  }

  const reelRef = doc(db, 'reels', reelId).withConverter(reelConverter);

  return onSnapshot(
    reelRef,
    (snapshot) => {
      onChange(snapshot.exists() ? snapshot.data() : null);
    },
    (error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to watch reel'));
    }
  );
}
