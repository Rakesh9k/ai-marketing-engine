import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { getVisionAI } from '../../services/ai/factory/aiProviderFactory';
import { verifyBusinessAccess } from '../../middleware/auth';
import { getStorage } from 'firebase-admin/storage';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { executeWithUsageControl, USAGE_ERROR_CODES } from '../../services/usageControl';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { UsageErrorCode } from '../../services/usageControl';

const analyzeReferenceStyleSchema = z.object({
  businessId: z.string().min(1),
  storagePath: z.string().min(1),
  // Phase 8 Credits & Usage Enforcement Audit: this callable makes a real
  // Vision-AI provider call but previously had no credit cost, no
  // idempotency key, and no rate limit at all — an unlimited free-AI-usage
  // gap. A fresh client-generated UUID per analysis attempt, same pattern
  // as every other credited AI operation (generateCampaignStrategy.ts,
  // regenerateAsset.ts, generateReel.ts).
  idempotencyKey: z.string().uuid(),
});

export const analyzeReferenceStyle = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    timeoutSeconds: 120,
    // Phase 12 Secret Handling audit — see generateCampaignStrategy.ts.
    secrets: ['GEMINI_API_KEY'],
  },
  validatedCallable(analyzeReferenceStyleSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('analyzeReferenceStyle', {
      userId: context.userId,
      businessId: data.businessId,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'analyzeReferenceStyle');

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

      const { result: styleProfile } = await executeWithUsageControl(
        context.userId,
        data.idempotencyKey,
        'style_analysis',
        async () => {
          // Get a signed URL for the vision model
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          });

          return getVisionAI().analyzeReferenceStyle(url);
        },
        { businessId: data.businessId }
      );

      logFunctionComplete(logger, startTime, { success: true });
      return styleProfile;
    } catch (error) {
      const code = (error as { code?: UsageErrorCode }).code;
      if (code === USAGE_ERROR_CODES.INSUFFICIENT_CREDITS) {
        logFunctionError(logger, startTime, error as Error);
        throw new HttpsError('failed-precondition', 'Insufficient credits for style analysis');
      }
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
