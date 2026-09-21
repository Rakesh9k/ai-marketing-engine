import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { createAssetDoc, getAssetDoc, getReelProjectDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { MAX_CLIP_FILE_SIZE_BYTES, MAX_REEL_CLIPS, MAX_TOTAL_UPLOAD_SIZE_BYTES } from '../../config/reels';
import type { Asset } from '../../types';

const db = admin.firestore();

const confirmReelClipUploadSchema = z.object({
  businessId: z.string().min(1),
  reelId: z.string().min(1),
  clipId: z.string().min(1),
  storagePath: z.string().min(1),
  metadata: z.object({
    originalName: z.string(),
    mimeType: z.string().regex(/^video\/(mp4|quicktime|webm|x-matroska)$/),
    size: z.number().positive().max(MAX_CLIP_FILE_SIZE_BYTES),
  }),
});

export const confirmReelClipUpload = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(confirmReelClipUploadSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('confirmReelClipUpload', {
      userId: context.userId,
      businessId: data.businessId,
      reelId: data.reelId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'reelClipUpload');

      const reel = await getReelProjectDoc(data.reelId);
      if (!reel || reel.businessId !== data.businessId) {
        throw new HttpsError('not-found', 'Reel project not found');
      }
      if (reel.status !== 'draft' && reel.status !== 'uploading') {
        throw new HttpsError('failed-precondition', 'This reel is no longer accepting clip uploads');
      }
      if (reel.inputClipIds.length >= MAX_REEL_CLIPS) {
        throw new HttpsError('failed-precondition', `A Reel can use at most ${MAX_REEL_CLIPS} clips`);
      }

      const bucket = admin.storage().bucket();
      const file = bucket.file(data.storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'Uploaded clip not found in storage');
      }

      // Total-upload-size ceiling is enforced here (not just per-clip) —
      // AGENTS.md section 3 "maximum total upload size must be enforced".
      const existingAssets = await Promise.all(reel.inputClipIds.map((id) => getAssetDoc(id)));
      const priorTotalSize = existingAssets.reduce((sum, a) => sum + (a?.size || 0), 0);
      if (priorTotalSize + data.metadata.size > MAX_TOTAL_UPLOAD_SIZE_BYTES) {
        throw new HttpsError(
          'failed-precondition',
          'Total size of all clips for this Reel is too large. Try uploading fewer or shorter clips.'
        );
      }

      const [downloadURL] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const assetId = uuidv7();
      const asset: Asset = {
        assetId,
        userId: context.userId,
        businessId: data.businessId,
        name: data.metadata.originalName,
        storagePath: data.storagePath,
        fileName: data.storagePath.split('/').pop() || 'unknown',
        mimeType: data.metadata.mimeType,
        size: data.metadata.size,
        width: 0,
        height: 0,
        assetType: 'reel_clip',
        status: 'completed',
        previewUrl: downloadURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createAssetDoc(asset);

      await db
        .collection('reels')
        .doc(data.reelId)
        .update({
          inputClipIds: FieldValue.arrayUnion(assetId),
          status: 'uploading',
          updatedAt: FieldValue.serverTimestamp(),
        });

      logFunctionComplete(logger, startTime, { success: true, assetId, storagePath: data.storagePath });
      return { assetId, asset, downloadURL };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
