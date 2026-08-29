import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { createAssetDoc, getAssetDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Asset, AssetType } from '../../types';

const confirmUploadSchema = z.object({
  businessId: z.string().min(1),
  storagePath: z.string().min(1),
  assetType: z
    .enum(['poster', 'headline', 'ad_copy', 'caption', 'story', 'reel', 'whatsapp', 'cta'])
    .optional(),
  metadata: z
    .object({
      originalName: z.string(),
      mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/),
      size: z
        .number()
        .positive()
        .max(10 * 1024 * 1024),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
    })
    .optional(),
});

export const confirmUpload = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(confirmUploadSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('confirmUpload', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);
      await checkRateLimit(context.userId, 'confirmUpload');

      const { storagePath, assetType = 'product', metadata } = data;
      const businessId = data.businessId;
      const userId = context.userId;

      // Verify the file exists in storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'Uploaded file not found in storage');
      }

      // Get the download URL
      const [downloadURL] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Generate asset ID
      const assetId = uuidv7();

      // Create asset record in Firestore
      const allowedAssetTypes = [
        'poster',
        'headline',
        'ad_copy',
        'caption',
        'story',
        'reel',
        'whatsapp',
        'cta',
      ] as const;
      const validAssetType = allowedAssetTypes.includes(
        assetType as (typeof allowedAssetTypes)[number]
      )
        ? (assetType as AssetType)
        : ('poster' as AssetType);
      const asset: Asset = {
        assetId,
        userId,
        businessId,
        name: metadata?.originalName || 'uploaded-image',
        description: undefined,
        storagePath,
        fileName: storagePath.split('/').pop() || 'unknown',
        mimeType: metadata?.mimeType || 'image/jpeg',
        size: metadata?.size || 0,
        width: metadata?.width || 0,
        height: metadata?.height || 0,
        assetType: validAssetType,
        status: 'completed',
        previewUrl: downloadURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createAssetDoc(asset);

      logFunctionComplete(logger, startTime, { success: true, assetId, storagePath });
      return {
        assetId,
        asset,
        downloadURL,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
