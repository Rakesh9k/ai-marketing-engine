import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const getUploadUrlSchema = z.object({
  businessId: z.string().min(1),
  assetType: z.enum(['product', 'campaign', 'brand-kit', 'logo']).optional(),
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
  fileSize: z
    .number()
    .positive()
    .max(10 * 1024 * 1024), // 10MB max
});

export const getUploadUrl = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(getUploadUrlSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getUploadUrl', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'getUploadUrl');

      const { fileName, contentType, fileSize, assetType = 'product' } = data;
      const businessId = data.businessId;
      const userId = context.userId;

      // Generate unique asset ID and storage path
      const assetId = uuidv7();
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `businesses/${businessId}/${assetType}s/${assetId}/${timestamp}_${sanitizedFileName}`;

      // Get storage bucket
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);

      // Generate signed URL for upload (15 minutes expiry)
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: contentType,
        extensionHeaders: {
          'Content-Type': contentType,
        },
      });

      // Return upload URL and metadata
      logFunctionComplete(logger, startTime, { success: true, assetId, storagePath });
      return {
        uploadUrl: signedUrl,
        storagePath,
        assetId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
