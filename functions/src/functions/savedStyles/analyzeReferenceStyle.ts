import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { geminiVisionProvider } from '../../services/ai/vision';
import { verifyBusinessAccess } from '../../middleware/auth';
import { getStorage } from 'firebase-admin/storage';
import { validatedCallable } from '../../middleware/validation';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const analyzeReferenceStyleSchema = z.object({
  businessId: z.string().min(1),
  storagePath: z.string().min(1),
});

export const analyzeReferenceStyle = onCall(
  { region: 'asia-south1', enforceAppCheck: true, timeoutSeconds: 120 },
  validatedCallable(analyzeReferenceStyleSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('analyzeReferenceStyle', {
      userId: context.userId,
      businessId: data.businessId,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      // Ensure the storage path is within the business's scope to prevent cross-tenant access
      if (!data.storagePath.startsWith(`businesses/${data.businessId}/`)) {
        throw new HttpsError('permission-denied', 'Invalid storage path access');
      }

      const bucket = getStorage().bucket();
      const file = bucket.file(data.storagePath);

      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'Reference image not found in storage');
      }

      // Get a signed URL for the vision model
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      // Analyze the style
      const styleProfile = await geminiVisionProvider.analyzeReferenceStyle(url);

      logFunctionComplete(logger, startTime, { success: true });
      return styleProfile;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
