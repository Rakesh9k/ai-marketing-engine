import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { performanceRecommendationService } from '../../services/recommendation/performanceRecommendationService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const getPerformanceRecommendationsSchema = z.object({
  businessId: z.string().min(1),
  refresh: z.boolean().optional().default(false),
});

export const getPerformanceRecommendations = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getPerformanceRecommendationsSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getPerformanceRecommendations', {
      userId: context.userId,
      businessId: data.businessId,
      refresh: data.refresh,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      const result = data.refresh
        ? await performanceRecommendationService.evaluateBusinessRecommendations(data.businessId)
        : await performanceRecommendationService.getRecommendationsForBusiness(data.businessId);

      logFunctionComplete(logger, startTime, {
        success: true,
        hasEnoughEvidence: result.hasEnoughEvidence,
        sampleSize: result.sampleSize,
        recommendationCount: result.recommendations.length,
      });

      return result;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
