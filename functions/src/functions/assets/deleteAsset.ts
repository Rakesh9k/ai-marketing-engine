import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { deleteAssetDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const deleteAssetSchema = z.object({
  storagePath: z.string().min(1),
  businessId: z.string().optional(),
  assetId: z.string().optional(),
});

export const deleteAsset = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(deleteAssetSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('deleteAsset', {
      userId: context.userId,
      businessId: data.businessId,
      storagePath: data.storagePath,
    });

    try {
      const { storagePath, assetId } = data;
      const userId = context.userId;

      // Extract and validate businessId from storagePath
      const parts = storagePath.split('/');
      if (parts.length < 3 || parts[0] !== 'businesses' || !parts[1]) {
        logger.warn('deleteAsset denied: storagePath is invalid or un-scoped', {
          userId,
          storagePath,
        });
        throw new HttpsError('permission-denied', 'storagePath does not belong to businessId');
      }

      const pathBusinessId = parts[1];

      // If businessId was explicitly supplied by client, verify it matches storagePath scope
      if (data.businessId && data.businessId !== pathBusinessId) {
        logger.warn('deleteAsset denied: explicit businessId does not match storagePath', {
          userId,
          explicitBusinessId: data.businessId,
          pathBusinessId,
        });
        throw new HttpsError('permission-denied', 'storagePath does not belong to businessId');
      }

      const businessId = pathBusinessId;

      // Verify user has permission to access this business
      await verifyBusinessAccess(userId, businessId);
      await checkRateLimit(userId, 'deleteAsset');

      // Delete storage object if it exists
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (exists) {
        try {
          await file.delete();
        } catch (storageError) {
          logger.error('Storage deletion failed', {
            error: storageError instanceof Error ? storageError.message : String(storageError),
            storagePath,
          });
          throw new HttpsError('internal', 'Failed to delete file from storage');
        }
      } else {
        logger.info('File not found in storage, proceeding with Firestore record cleanup', {
          storagePath,
        });
      }

      // Update Firestore asset record(s)
      const db = admin.firestore();
      if (assetId) {
        await deleteAssetDoc(assetId);
      } else {
        const snap = await db
          .collection('assets')
          .where('businessId', '==', businessId)
          .where('storagePath', '==', storagePath)
          .get();

        const updatePromises = snap.docs.map((doc) => deleteAssetDoc(doc.id));
        await Promise.all(updatePromises);
      }

      logFunctionComplete(logger, startTime, { success: true, storagePath, businessId });
      return { success: true, storagePath };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
