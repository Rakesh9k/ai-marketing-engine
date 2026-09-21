import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getReelProjectDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { MAX_CLIP_FILE_SIZE_BYTES, MAX_REEL_CLIPS } from '../../config/reels';

// Raw phone footage — unlike the image-only getUploadUrl.ts (10MB, jpeg/png/webp),
// this accepts common video formats produced by phone cameras at a much
// larger per-clip ceiling (see AGENTS.md section 3 "common video formats
// supported by the existing infrastructure").
const getReelClipUploadUrlSchema = z.object({
  businessId: z.string().min(1),
  reelId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().regex(/^video\/(mp4|quicktime|webm|x-matroska)$/),
  fileSize: z.number().positive().max(MAX_CLIP_FILE_SIZE_BYTES),
});

export const getReelClipUploadUrl = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(getReelClipUploadUrlSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getReelClipUploadUrl', {
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
        throw new HttpsError(
          'failed-precondition',
          'This reel is no longer accepting clip uploads'
        );
      }
      if (reel.inputClipIds.length >= MAX_REEL_CLIPS) {
        throw new HttpsError(
          'failed-precondition',
          `A Reel can use at most ${MAX_REEL_CLIPS} clips`
        );
      }

      const clipId = uuidv7();
      const timestamp = Date.now();
      const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `businesses/${data.businessId}/reels/${data.reelId}/input/${clipId}/${timestamp}_${sanitizedFileName}`;

      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 30 * 60 * 1000, // 30 minutes — larger video files need more upload time than the 15-minute image-upload window
        contentType: data.contentType,
        extensionHeaders: { 'Content-Type': data.contentType },
      });

      logFunctionComplete(logger, startTime, { success: true, clipId, storagePath });
      return {
        uploadUrl: signedUrl,
        storagePath,
        clipId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
