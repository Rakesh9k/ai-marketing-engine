import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { createAssetDoc, getAssetDoc } from '../../services/firestore';
import { getDurableDownloadUrl } from '../../services/storageUrls';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Asset, AssetType } from '../../types';

const confirmUploadSchema = z.object({
  businessId: z.string().min(1),
  storagePath: z.string().min(1),
  assetType: z
    .enum([
      'poster',
      'headline',
      'ad_copy',
      'caption',
      'story',
      'reel',
      'whatsapp',
      'cta',
      'product',
      'campaign',
      'brand-kit',
      'logo',
    ])
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
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'confirmUpload');

      const { storagePath, assetType = 'product', metadata } = data;
      const businessId = data.businessId;
      const userId = context.userId;

      // Defense in depth: verifyBusinessAccess above only proves the caller
      // owns/has access to `businessId` — it says nothing about whether
      // `storagePath` (a client-supplied string) actually points inside
      // that business's own Storage folder. Without this check, a caller
      // who owns Business A could pass Business A's businessId alongside a
      // storagePath belonging to Business B (e.g. leaked via a log, a
      // referrer header, or a guessed path) and this function would happily
      // generate a 7-day admin-signed download URL for Business B's file
      // (admin.storage() bypasses storage.rules entirely) and persist a
      // campaign_assets doc pointing at it. getUploadUrl.ts always
      // generates paths as `businesses/${businessId}/...`, so a legitimate
      // caller's storagePath must already start with their own verified
      // businessId's prefix.
      const expectedPrefix = `businesses/${businessId}/`;
      if (!storagePath.startsWith(expectedPrefix)) {
        logger.warn('confirmUpload denied: storagePath outside caller business scope', {
          userId,
          businessId,
        });
        throw new HttpsError('permission-denied', 'storagePath does not belong to businessId');
      }

      // Verify the file exists in storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'Uploaded file not found in storage');
      }

      // Phase 4 Storage Security Audit: getUploadUrl.ts's signed URL only
      // constrains the Content-Type header the PUT must send — it does NOT
      // (and, with a plain V4 "write" signed URL, cannot) cap the actual
      // number of bytes the client sends, and `metadata.size`/`mimeType`
      // above are the CLIENT's own claim, never checked against the real
      // uploaded object. Without this, a caller could request a signed URL
      // for a 1KB image, then PUT an arbitrarily large file through it —
      // paying nothing extra client-side while the bucket absorbs the real
      // storage cost — and this function would persist the client's forged
      // (small) size into the asset doc regardless. Re-deriving size/
      // contentType from the actual GCS object (not the request body) closes
      // that gap; oversized or mistyped uploads are deleted rather than
      // silently accepted.
      const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
      const [realMetadata] = await file.getMetadata();
      const realSize = Number(realMetadata.size || 0);
      const realContentType = realMetadata.contentType || '';
      if (realSize > MAX_UPLOAD_BYTES || !/^image\/(jpeg|png|webp)$/.test(realContentType)) {
        await file.delete().catch(() => undefined);
        logger.warn('confirmUpload denied: uploaded object failed server-side validation', {
          userId,
          businessId,
          realSize,
          realContentType,
        });
        throw new HttpsError(
          'invalid-argument',
          'Uploaded file exceeds the size limit or is not a supported image type'
        );
      }

      // F2: a durable, non-expiring download URL (token-based, same
      // mechanism as the client SDK's getDownloadURL()) — not a 7-day
      // signed URL, which used to make product photos silently stop
      // reaching the vision pipeline a week after upload.
      const downloadURL = await getDurableDownloadUrl(storagePath);

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
        'product',
        'campaign',
        'brand-kit',
        'logo',
      ] as const;
      const validAssetType = allowedAssetTypes.includes(
        assetType as (typeof allowedAssetTypes)[number]
      )
        ? (assetType as AssetType)
        : ('product' as AssetType);
      const asset: Asset = {
        assetId,
        userId,
        businessId,
        name: metadata?.originalName || 'uploaded-image',
        description: undefined,
        storagePath,
        fileName: storagePath.split('/').pop() || 'unknown',
        // Server-verified values (realSize/realContentType), not the
        // client's claimed metadata — see the validation block above.
        mimeType: realContentType,
        size: realSize,
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
